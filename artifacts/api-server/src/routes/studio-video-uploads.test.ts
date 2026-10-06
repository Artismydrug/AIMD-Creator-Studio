import express, { type Express } from "express";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import storageRouter from "./storage";
import studioPostsRouter from "./studio-posts";

const execFileAsync = promisify(execFile);
const MAX_STUDIO_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Keep the cloud boundary out of these API tests. The route still performs all
 * MIME, magic-byte, ffprobe, purpose, and database work against real code.
 */
vi.mock("../lib/objectStorage", () => {
  let objectNumber = 0;

  class MockObjectStorageService {
    async uploadObjectEntity(): Promise<string> {
      objectNumber += 1;
      return `/objects/uploads/studio-api-test-${objectNumber}`;
    }
  }

  class MockObjectNotFoundError extends Error {}

  return {
    ObjectStorageService: MockObjectStorageService,
    ObjectNotFoundError: MockObjectNotFoundError,
  };
});

type TestUser = {
  id: number;
  email: string;
  username: string;
};

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
let creator: TestUser;
let otherCreator: TestUser;
let shortVideo: Buffer;
let sixtySecondVideo: Buffer;
let sixtyOneSecondVideo: Buffer;
let audioOnlyMp4: Buffer;
let longAudio: Buffer;
let audioWithArtwork: Buffer;
let testMediaDir: string;

function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", storageRouter);
  app.use("/api", studioPostsRouter);
  return app;
}

async function createVideoFixture(
  outputPath: string,
  durationSeconds: number,
): Promise<Buffer> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=16x16:r=1",
    "-t",
    String(durationSeconds),
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
  return readFile(outputPath);
}

async function createAudioOnlyMp4(outputPath: string, seconds = 1): Promise<Buffer> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=8000",
    "-t",
    String(seconds),
    "-vn",
    "-c:a",
    "aac",
    outputPath,
  ]);
  return readFile(outputPath);
}

async function uploadStudioVideo(
  user: TestUser,
  media: Buffer = shortVideo,
): Promise<request.Response> {
  return request(appFor(user))
    .post("/api/storage/uploads")
    .set("Content-Type", "video/mp4")
    .set("X-AIMD-Upload-Purpose", "studio_post")
    .send(media);
}

async function createStudioPost(user: TestUser, imageUrl: string, mediaType: "video" | "audio" = "video") {
  return request(appFor(user))
    .post("/api/studio-posts")
    .send({
      imageUrl,
      mediaType,
      caption: `Studio API regression ${suffix}`,
      tags: [],
    });
}

beforeAll(async () => {
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username)
     VALUES ($1, $2), ($3, $4)
     RETURNING id, email, username`,
    [
      `studio_video_creator_${suffix}@example.test`,
      `studio_video_creator_${suffix}`,
      `studio_video_other_${suffix}@example.test`,
      `studio_video_other_${suffix}`,
    ],
  );
  [creator, otherCreator] = rows;

  testMediaDir = await mkdtemp(join(tmpdir(), "aimd-studio-video-test-"));
  shortVideo = await createVideoFixture(join(testMediaDir, "short.mp4"), 1);
  sixtySecondVideo = await createVideoFixture(
    join(testMediaDir, "sixty-seconds.mp4"),
    60,
  );
  sixtyOneSecondVideo = await createVideoFixture(
    join(testMediaDir, "sixty-one-seconds.mp4"),
    61,
  );
  audioOnlyMp4 = await createAudioOnlyMp4(
    join(testMediaDir, "audio-only.mp4"),
  );
  longAudio = await createAudioOnlyMp4(join(testMediaDir, "long-audio.m4a"), 601);
  const artworkPath = join(testMediaDir, "audio-with-art.mp3");
  await execFileAsync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000",
    "-f", "lavfi", "-i", "color=c=red:s=16x16:r=1",
    "-t", "1", "-map", "0:a", "-map", "1:v", "-frames:v", "1",
    "-c:a", "libmp3lame", "-c:v", "mjpeg", "-disposition:v", "attached_pic",
    "-id3v2_version", "3", artworkPath,
  ]);
  audioWithArtwork = await readFile(artworkPath);
}, 60_000);

async function uploadStudioAudio(user: TestUser, media = audioOnlyMp4, contentType = "audio/mp4") {
  return request(appFor(user))
    .post("/api/storage/uploads")
    .set("Content-Type", contentType)
    .set("X-AIMD-Upload-Purpose", "studio_post")
    .send(media);
}

describe("Studio audio posts", () => {
  it("uploads, publishes, and returns an audio post after reload", async () => {
    const upload = await uploadStudioAudio(creator);
    expect(upload.status).toBe(200);
    expect(upload.body.mediaType).toBe("audio");
    expect(upload.body.measuredDurationSeconds).toBeGreaterThan(0);
    const url = `/api/storage${upload.body.objectPath}`;
    const post = await createStudioPost(creator, url, "audio");
    expect(post.status).toBe(201);
    expect(post.body).toMatchObject({ imageUrl: url, mediaType: "audio" });
    const detail = await request(appFor(creator)).get(`/api/studio-posts/${post.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.mediaType).toBe("audio");
    const feed = await request(appFor(otherCreator)).get(`/api/studio-posts?userId=${creator.id}`);
    expect(feed.status).toBe(200);
    expect(feed.body.some((item: { id: number; mediaType: string }) =>
      item.id === post.body.id && item.mediaType === "audio")).toBe(true);
    const reuse = await createStudioPost(creator, url, "audio");
    expect(reuse.status).toBe(400);
  });

  it("accepts an MP3 with embedded album artwork", async () => {
    const upload = await uploadStudioAudio(creator, audioWithArtwork, "audio/mpeg");
    expect(upload.status).toBe(200);
    expect(upload.body.mediaType).toBe("audio");
  });

  it("does not let a different creator claim an audio upload", async () => {
    const upload = await uploadStudioAudio(creator);
    expect(upload.status).toBe(200);
    const post = await createStudioPost(otherCreator, `/api/storage${upload.body.objectPath}`, "audio");
    expect(post.status).toBe(400);
    expect(post.body.error).toContain("belongs to another creator");
  });

  it("requires a validated audio upload rather than an external URL", async () => {
    const post = await createStudioPost(creator, "https://example.test/track.mp3", "audio");
    expect(post.status).toBe(400);
    const missing = await request(appFor(creator)).post("/api/studio-posts")
      .send({ mediaType: "audio", caption: "No attachment" });
    expect(missing.status).toBe(400);
  });

  it("rejects audio longer than ten minutes", async () => {
    const upload = await uploadStudioAudio(creator, longAudio);
    expect(upload.status).toBe(422);
    expect(upload.body.maxAllowed).toBe(600);
  });

  it("rejects audio over 25 MB before storing it", async () => {
    const upload = await uploadStudioAudio(creator, Buffer.alloc(25 * 1024 * 1024 + 1));
    expect(upload.status).toBe(413);
  });

  it("rejects a corrupt audio file even when its signature looks like MP3", async () => {
    const upload = await uploadStudioAudio(creator, Buffer.from("ID3not-real-audio"), "audio/mpeg");
    expect(upload.status).toBe(422);
  });

  it("rejects a video masquerading as an audio track", async () => {
    const upload = await uploadStudioAudio(creator, shortVideo);
    expect(upload.status).toBe(422);
    expect(upload.body.reason).toBe("no_audio_stream");
  });
});

afterAll(async () => {
  const ids = [creator?.id, otherCreator?.id].filter(Boolean);
  if (ids.length > 0) {
    await pool.query(
      "DELETE FROM studio_posts WHERE user_id = ANY($1::int[])",
      [ids],
    );
    await pool.query(
      "DELETE FROM studio_post_media_uploads WHERE user_id = ANY($1::int[])",
      [ids],
    );
    await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
  }
  if (testMediaDir) await rm(testMediaDir, { recursive: true, force: true });
});

describe("Studio video upload API guardrails", () => {
  it("rejects a video upload without the Studio purpose", async () => {
    const res = await request(appFor(creator))
      .post("/api/storage/uploads")
      .set("Content-Type", "video/mp4")
      .send(shortVideo);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("require a valid upload purpose");
  });

  it("rejects an audio-only MP4 sent as a video upload", async () => {
    const res = await uploadStudioVideo(creator, audioOnlyMp4);

    expect(res.status).toBe(422);
    expect(res.body.reason).toBe("no_video_stream");
    expect(res.body.error).toContain("No video stream found");
  });

  it("accepts a video measured at exactly 60 seconds", async () => {
    const res = await uploadStudioVideo(creator, sixtySecondVideo);

    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe("video");
    expect(res.body.measuredDurationSeconds).toBe(60);
  });

  it("rejects a video measured over 60 seconds", async () => {
    const res = await uploadStudioVideo(creator, sixtyOneSecondVideo);

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("exceeds the 60-second limit");
    expect(res.body.measuredDurationSeconds).toBe(61);
    expect(res.body.maxAllowed).toBe(60);
  });

  it("accepts a Studio video whose payload is exactly 50 MB", async () => {
    const exactFiftyMegabytes = Buffer.concat([
      shortVideo,
      Buffer.alloc(MAX_STUDIO_VIDEO_BYTES - shortVideo.length),
    ]);
    expect(exactFiftyMegabytes.length).toBe(MAX_STUDIO_VIDEO_BYTES);

    const res = await uploadStudioVideo(creator, exactFiftyMegabytes);

    expect(res.status).toBe(200);
    const { rows } = await pool.query<{ file_size_bytes: number }>(
      `SELECT file_size_bytes
         FROM studio_post_media_uploads
        WHERE object_path = $1`,
      [res.body.objectPath],
    );
    expect(rows[0].file_size_bytes).toBe(MAX_STUDIO_VIDEO_BYTES);
  });

  it("rejects a Studio video larger than 50 MB", async () => {
    const overLimit = Buffer.concat([
      shortVideo,
      Buffer.alloc(MAX_STUDIO_VIDEO_BYTES - shortVideo.length + 1),
    ]);
    expect(overLimit.length).toBe(MAX_STUDIO_VIDEO_BYTES + 1);

    const res = await uploadStudioVideo(creator, overLimit);

    expect(res.status).toBe(413);
    expect(res.body.error).toContain("50 MB or smaller");
  });
});

describe("Studio video post claiming", () => {
  it("rejects arbitrary video URLs before creating a post", async () => {
    const res = await createStudioPost(
      creator,
      "https://example.com/not-a-studio-upload.mp4",
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("validated Studio upload");
  });

  it("rejects a Studio upload owned by another creator", async () => {
    const upload = await uploadStudioVideo(creator);
    expect(upload.status).toBe(200);

    const res = await createStudioPost(
      otherCreator,
      `/api/storage${upload.body.objectPath}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("belongs to another creator");

    const { rows } = await pool.query<{
      post_id: number | null;
      consumed_at: Date | null;
    }>(
      `SELECT post_id, consumed_at
         FROM studio_post_media_uploads
        WHERE object_path = $1`,
      [upload.body.objectPath],
    );
    expect(rows[0].post_id).toBeNull();
    expect(rows[0].consumed_at).toBeNull();
  });

  it("claims a valid creator-owned upload exactly once", async () => {
    const upload = await uploadStudioVideo(creator);
    expect(upload.status).toBe(200);
    const imageUrl = `/api/storage${upload.body.objectPath}`;

    const firstPost = await createStudioPost(creator, imageUrl);
    expect(firstPost.status).toBe(201);

    const { rows: claimed } = await pool.query<{
      post_id: number | null;
      consumed_at: Date | null;
    }>(
      `SELECT post_id, consumed_at
         FROM studio_post_media_uploads
        WHERE object_path = $1`,
      [upload.body.objectPath],
    );
    expect(claimed[0].post_id).toBe(firstPost.body.id);
    expect(claimed[0].consumed_at).not.toBeNull();

    const reusedPost = await createStudioPost(creator, imageUrl);
    expect(reusedPost.status).toBe(400);
    expect(reusedPost.body.error).toContain("already used");

    const { rows: posts } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM studio_posts
        WHERE user_id = $1
          AND image_url = $2`,
      [creator.id, imageUrl],
    );
    expect(posts[0].count).toBe(1);
  });
});
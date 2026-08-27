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

async function createAudioOnlyMp4(outputPath: string): Promise<Buffer> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=8000",
    "-t",
    "1",
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

async function createStudioPost(user: TestUser, imageUrl: string) {
  return request(appFor(user))
    .post("/api/studio-posts")
    .send({
      imageUrl,
      mediaType: "video",
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
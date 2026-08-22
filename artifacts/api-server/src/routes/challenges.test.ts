import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import challengesRouter, { isChallengeSubmissionOpen } from "./challenges";

type TestUser = {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
};

let creator: TestUser;
let otherCreator: TestUser;
let admin: TestUser;
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin,
    };
    (req as any).log = { error: () => undefined };
    next();
  });
  app.use("/api", challengesRouter);
  return app;
}

async function createProofUpload(
  ownerId: number,
  {
    purpose = "challenge_final",
    captureSource = "native_camera",
    capturedAt = "2026-08-21T18:00:00.000Z",
  }: {
    purpose?: "challenge_final" | "challenge_process";
    captureSource?: "native_camera" | "media_library";
    capturedAt?: string | null;
  } = {},
): Promise<{ id: number; objectPath: string }> {
  const objectPath = `/objects/test-proof-${suffix}-${Date.now()}-${Math.random()}`;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO challenge_media_uploads
       (user_id, object_path, purpose, media_type, content_type, sha256,
        capture_source, captured_at, exif_timestamp, capture_metadata)
     VALUES ($1, $2, $3, 'image', 'image/jpeg', $4, $5, $6, $6, $7::jsonb)
     RETURNING id`,
    [
      ownerId,
      objectPath,
      purpose,
      `sha256-${suffix}`,
      captureSource,
      capturedAt,
      JSON.stringify({
        devicePlatform: "ios",
        cameraFacing: "back",
        deviceMake: "Private test device",
      }),
    ],
  );
  return { id: rows[0].id, objectPath };
}

beforeAll(async () => {
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin)
     VALUES
       ($1, $2, false),
       ($3, $4, false),
       ($5, $6, true)
     RETURNING id, email, username, is_admin`,
    [
      `challenge_creator_${suffix}@example.test`,
      `challenge_creator_${suffix}`,
      `challenge_other_${suffix}@example.test`,
      `challenge_other_${suffix}`,
      `challenge_admin_${suffix}@example.test`,
      `challenge_admin_${suffix}`,
    ],
  );
  [creator, otherCreator, admin] = rows;
});

afterAll(async () => {
  const ids = [creator?.id, otherCreator?.id, admin?.id].filter(Boolean);
  if (ids.length > 0) {
    await pool.query(
      `DELETE FROM challenge_submissions WHERE user_id = ANY($1::int[])`,
      [ids],
    );
    await pool.query(
      `DELETE FROM challenge_media_uploads WHERE user_id = ANY($1::int[])`,
      [ids],
    );
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
  }
});

describe("challenge proof-of-work submissions", () => {
  it("rejects receipt after the challenge deadline", () => {
    expect(
      isChallengeSubmissionOpen(
        new Date("2026-08-24T07:00:01.000Z"),
        new Date("2026-08-24T00:00:00-07:00"),
      ),
    ).toBe(false);
  });

  it("requires a final proof media reference", async () => {
    const res = await request(appFor(creator))
      .post("/api/challenges/submit")
      .send({ caption: "A finished study", tags: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("rejects a library upload as the final proof", async () => {
    const proof = await createProofUpload(creator.id, {
      captureSource: "media_library",
    });
    const res = await request(appFor(creator))
      .post("/api/challenges/submit")
      .send({
        caption: "A finished study",
        finalMedia: { objectPath: proof.objectPath },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/camera/i);
  });

  it("does not allow a creator to submit another creator's upload", async () => {
    const proof = await createProofUpload(otherCreator.id);
    const res = await request(appFor(creator))
      .post("/api/challenges/submit")
      .send({
        caption: "A finished study",
        finalMedia: { objectPath: proof.objectPath },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/camera/i);
  });

  it("creates a pending entry and keeps hashes and device metadata private", async () => {
    const finalProof = await createProofUpload(creator.id);
    const processProof = await createProofUpload(creator.id, {
      purpose: "challenge_process",
      captureSource: "media_library",
    });

    const created = await request(appFor(creator))
      .post("/api/challenges/submit")
      .send({
        caption: "Built live from today's observation",
        tags: ["study"],
        finalMedia: { objectPath: finalProof.objectPath },
        processMedia: { objectPath: processProof.objectPath },
      });

    expect(created.status).toBe(201);
    expect(created.body.verificationStatus).toBe("pending_review");

    const current = await request(appFor(creator)).get(
      "/api/challenges/current",
    );
    expect(current.status).toBe(200);
    const submission = current.body.submissions.find(
      (entry: { id: number }) => entry.id === created.body.submissionId,
    );

    expect(submission.verificationStatus).toBe("pending_review");
    expect(submission.finalMedia.captureSource).toBe("native_camera");
    expect(submission.processMedia.captureSource).toBe("media_library");
    expect(JSON.stringify(submission)).not.toContain("sha256");
    expect(JSON.stringify(submission)).not.toContain("Private test device");
  });

  it("allows only an admin reviewer to change verification status", async () => {
    const finalProof = await createProofUpload(otherCreator.id);
    const created = await request(appFor(otherCreator))
      .post("/api/challenges/submit")
      .send({
        caption: "A second creator's study",
        finalMedia: { objectPath: finalProof.objectPath },
      });

    expect(created.status).toBe(201);

    const forbidden = await request(appFor(otherCreator))
      .patch(
        `/api/challenges/${created.body.submissionId}/verification`,
      )
      .send({ status: "verified_authentic" });
    expect(forbidden.status).toBe(403);

    const reviewed = await request(appFor(admin))
      .patch(
        `/api/challenges/${created.body.submissionId}/verification`,
      )
      .send({ status: "instructor_approved" });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.verificationStatus).toBe("instructor_approved");
    expect(reviewed.body.verificationReviewedAt).toBeTruthy();
  });
});
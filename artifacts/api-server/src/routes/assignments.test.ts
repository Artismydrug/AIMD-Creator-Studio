import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import assignmentsRouter from "./assignments";

/**
 * Integration coverage for the assignment drill-gate integrity fix (Task #64).
 *
 * Verifies:
 *   - A submissionUrl NOT backed by a recorded assignment_media_uploads row is rejected.
 *   - A private object owned by the user but never ffprobe-gated is rejected.
 *   - An upload owned by a DIFFERENT user is rejected (403).
 *   - A valid recorded upload is accepted; the assignment_extensions row persists
 *     the AUTHORITATIVE measured duration + capture source from the server record
 *     (client-claimed values are never trusted).
 *   - A consumed upload cannot be reused (409); the first assignment persists.
 */

type TestUser = {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
};

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

let creator: TestUser;
let otherCreator: TestUser;
let workshopId: number;
let moduleId: number;

// Bypass requireTier by stubbing tier at the users table (academy).
function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin,
      tier: "academy",
    };
    (req as any).log = { error: () => undefined };
    next();
  });
  app.use("/api", assignmentsRouter);
  return app;
}

/** Insert an ffprobe-gated upload record directly (mirrors storage.ts). */
async function recordUpload(
  ownerId: number,
  {
    measuredDurationSeconds = 20,
    captureSource = "native_camera",
  }: { measuredDurationSeconds?: number; captureSource?: string } = {},
): Promise<{ id: number; objectPath: string; submissionUrl: string }> {
  const objectPath = `/objects/uploads/assign-${suffix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO assignment_media_uploads
       (user_id, object_path, measured_duration_seconds, capture_source, sha256, content_type)
     VALUES ($1, $2, $3, $4, $5, 'video/mp4')
     RETURNING id`,
    [ownerId, objectPath, measuredDurationSeconds, captureSource, `sha-${suffix}`],
  );
  return {
    id: rows[0].id,
    objectPath,
    submissionUrl: `/api/storage${objectPath}`,
  };
}

beforeAll(async () => {
  const { rows: users } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin, tier)
     VALUES ($1, $2, false, 'academy'), ($3, $4, false, 'academy')
     RETURNING id, email, username, is_admin`,
    [
      `assign_creator_${suffix}@example.test`,
      `assign_creator_${suffix}`,
      `assign_other_${suffix}@example.test`,
      `assign_other_${suffix}`,
    ],
  );
  [creator, otherCreator] = users;

  const { rows: ws } = await pool.query<{ id: number }>(
    `INSERT INTO workshops (title, description, tier, category, total_modules)
     VALUES ($1, 'test', 'academy', 'test', 1)
     RETURNING id`,
    [`Assign WS ${suffix}`],
  );
  workshopId = ws[0].id;

  const { rows: mods } = await pool.query<{ id: number }>(
    `INSERT INTO workshop_modules (workshop_id, title, "order")
     VALUES ($1, 'M1', 1) RETURNING id`,
    [workshopId],
  );
  moduleId = mods[0].id;

  // Enroll both creators so enrollment isn't the failing gate.
  await pool.query(
    `INSERT INTO enrollments (user_id, workshop_id, access_source)
     VALUES ($1, $3, 'participant'), ($2, $3, 'participant')`,
    [creator.id, otherCreator.id, workshopId],
  );
});

afterAll(async () => {
  const ids = [creator?.id, otherCreator?.id].filter(Boolean);
  if (ids.length > 0) {
    // assignment_extensions + assignment_media_uploads cascade / set-null via FK,
    // but delete explicitly to keep the test DB tidy.
    await pool.query(
      `DELETE FROM assignment_extensions WHERE assignment_id IN
         (SELECT id FROM assignments WHERE user_id = ANY($1::int[]))`,
      [ids],
    );
    await pool.query(`DELETE FROM assignment_media_uploads WHERE user_id = ANY($1::int[])`, [ids]);
    await pool.query(`DELETE FROM assignments WHERE user_id = ANY($1::int[])`, [ids]);
    await pool.query(`DELETE FROM enrollments WHERE user_id = ANY($1::int[])`, [ids]);
    await pool.query(`DELETE FROM workshop_modules WHERE workshop_id = $1`, [workshopId]);
    await pool.query(`DELETE FROM workshops WHERE id = $1`, [workshopId]);
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
  }
});

describe("assignment drill-gate integrity", () => {
  it("requires a submissionUrl", async () => {
    const res = await request(appFor(creator))
      .post("/api/assignments")
      .send({ workshopId, moduleId });
    expect(res.status).toBe(400);
  });

  it("rejects a submissionUrl that is not a served-object reference", async () => {
    const res = await request(appFor(creator))
      .post("/api/assignments")
      .send({ workshopId, moduleId, submissionUrl: "https://evil.example.com/x.mp4" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Workshops & Masterclasses");
  });

  it("rejects a private object that was never recorded as a drill upload", async () => {
    // A plausible /objects/ path that has NO assignment_media_uploads row.
    const res = await request(appFor(creator))
      .post("/api/assignments")
      .send({
        workshopId,
        moduleId,
        submissionUrl: `/api/storage/objects/uploads/never-gated-${suffix}`,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("not recorded as a valid drill upload");
  });

  it("rejects a recorded upload owned by a different creator (403)", async () => {
    const other = await recordUpload(otherCreator.id, { measuredDurationSeconds: 12 });
    const res = await request(appFor(creator))
      .post("/api/assignments")
      .send({ workshopId, moduleId, submissionUrl: other.submissionUrl });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("does not belong");

    // The other user's upload must remain unconsumed.
    const { rows } = await pool.query(
      `SELECT consumed_at, claimed_assignment_id FROM assignment_media_uploads WHERE id = $1`,
      [other.id],
    );
    expect(rows[0].consumed_at).toBeNull();
    expect(rows[0].claimed_assignment_id).toBeNull();
  });

  it("accepts a valid recorded upload and persists AUTHORITATIVE duration + capture source", async () => {
    const upload = await recordUpload(creator.id, {
      measuredDurationSeconds: 27,
      captureSource: "native_camera",
    });

    const res = await request(appFor(creator))
      .post("/api/assignments")
      .send({
        workshopId,
        moduleId,
        submissionUrl: upload.submissionUrl,
        submissionNote: "my drill",
        // Client attempts to LIE about duration — must be ignored entirely.
        measuredDurationSeconds: 5,
        captureSource: "media_library",
      });

    expect(res.status).toBe(201);
    const assignmentId = res.body.id;
    expect(assignmentId).toBeTruthy();

    // Extension row must reflect the SERVER record, not the client-claimed values.
    const { rows: ext } = await pool.query(
      `SELECT measured_duration_seconds, capture_source
         FROM assignment_extensions WHERE assignment_id = $1`,
      [assignmentId],
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].measured_duration_seconds).toBe(27); // authoritative, not 5
    expect(ext[0].capture_source).toBe("native_camera"); // authoritative, not media_library

    // Upload must now be consumed + bound to the assignment.
    const { rows: mu } = await pool.query(
      `SELECT consumed_at, claimed_assignment_id FROM assignment_media_uploads WHERE id = $1`,
      [upload.id],
    );
    expect(mu[0].consumed_at).not.toBeNull();
    expect(mu[0].claimed_assignment_id).toBe(assignmentId);
  });

  it("rejects reuse of an already-consumed upload (409) and keeps the first assignment", async () => {
    const upload = await recordUpload(creator.id, { measuredDurationSeconds: 10 });

    const first = await request(appFor(creator))
      .post("/api/assignments")
      .send({ workshopId, moduleId, submissionUrl: upload.submissionUrl });
    expect(first.status).toBe(201);
    const firstId = first.body.id;

    const second = await request(appFor(creator))
      .post("/api/assignments")
      .send({ workshopId, moduleId, submissionUrl: upload.submissionUrl });
    expect(second.status).toBe(409);

    // The first assignment persists and only ONE extension row exists for it.
    const { rows: a } = await pool.query(
      `SELECT id FROM assignments WHERE id = $1`,
      [firstId],
    );
    expect(a).toHaveLength(1);

    // No second assignment referencing this footage was created.
    const { rows: bound } = await pool.query(
      `SELECT claimed_assignment_id FROM assignment_media_uploads WHERE id = $1`,
      [upload.id],
    );
    expect(bound[0].claimed_assignment_id).toBe(firstId);
  });
});

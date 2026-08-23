import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import instructorRouter from "./instructor";
import workshopsRouter from "./workshops";
import { canInstructorAccessSubmission } from "./storage";

/**
 * Integration coverage for instructor review of student assignment footage
 * (Task #64 hardening).
 *
 * Assignment submissions are private objects owned by the student, so the
 * storage ACL alone would 403 an instructor. The serving route falls back to
 * `canInstructorAccessSubmission`, which must:
 *   - grant an instructor ASSIGNED to the assignment's workshop
 *   - deny an instructor NOT assigned to that workshop
 *   - deny an unrelated creator
 *
 * Also verifies the full review flow for an assigned non-admin instructor:
 * the submission appears in their queue and feedback can be recorded.
 */

type TestUser = {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
};

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

let student: TestUser;
let assignedInstructor: TestUser;
let unassignedInstructor: TestUser;
let workshopId: number;
let moduleId: number;
let otherWorkshopId: number;
let otherModuleId: number;
let assignmentId: number;
let objectPath: string;

function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin,
      tier: "free",
    };
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", instructorRouter);
  app.use("/api", workshopsRouter);
  return app;
}

beforeAll(async () => {
  const { rows: users } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin, tier)
     VALUES ($1, $2, false, 'academy'),
            ($3, $4, false, 'free'),
            ($5, $6, false, 'free')
     RETURNING id, email, username, is_admin`,
    [
      `media_student_${suffix}@example.test`,
      `media_student_${suffix}`,
      `media_instr_${suffix}@example.test`,
      `media_instr_${suffix}`,
      `media_other_instr_${suffix}@example.test`,
      `media_other_instr_${suffix}`,
    ],
  );
  [student, assignedInstructor, unassignedInstructor] = users;

  // Instructor roles (DB-authoritative)
  await pool.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, 'instructor'), ($2, 'instructor')`,
    [assignedInstructor.id, unassignedInstructor.id],
  );

  // Instructor profiles linked to real users
  const { rows: profiles } = await pool.query<{ id: number; user_id: number }>(
    `INSERT INTO instructor_profiles (user_id, display_name, mentor_slug, verified)
     VALUES ($1, 'Assigned Instructor', $2, true),
            ($3, 'Unassigned Instructor', $4, true)
     RETURNING id, user_id`,
    [
      assignedInstructor.id,
      `assigned-instr-${suffix}`,
      unassignedInstructor.id,
      `unassigned-instr-${suffix}`,
    ],
  );
  const assignedProfileId = profiles.find((p) => p.user_id === assignedInstructor.id)!.id;

  const { rows: ws } = await pool.query<{ id: number }>(
    `INSERT INTO workshops (title, description, tier, category, total_modules)
     VALUES ($1, 'test', 'academy', 'test', 1),
            ($2, 'test', 'workshop', 'test', 1)
     RETURNING id`,
    [`Media WS ${suffix}`, `Media WS other ${suffix}`],
  );
  workshopId = ws[0].id;
  otherWorkshopId = ws[1].id;

  // Only the assigned instructor is bound to the workshop
  await pool.query(
    `INSERT INTO workshop_instructors (workshop_id, instructor_id) VALUES ($1, $2)`,
    [workshopId, assignedProfileId],
  );

  const { rows: mods } = await pool.query<{ id: number }>(
    `INSERT INTO workshop_modules (workshop_id, title, "order")
     VALUES ($1, 'M1', 1), ($2, 'Other M1', 1) RETURNING id, workshop_id`,
    [workshopId, otherWorkshopId],
  );
  moduleId = mods[0].id;
  otherModuleId = mods[1].id;

  // Student submission referencing a private object
  objectPath = `/objects/uploads/media-access-${suffix}`;
  const { rows: assignments } = await pool.query<{ id: number }>(
    `INSERT INTO assignments (user_id, workshop_id, module_id, status, submission_url)
     VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
    [student.id, workshopId, moduleId, `/api/storage${objectPath}`],
  );
  assignmentId = assignments[0].id;
});

afterAll(async () => {
  const userIds = [student?.id, assignedInstructor?.id, unassignedInstructor?.id].filter(Boolean);
  await pool.query(
    `DELETE FROM assignment_extensions WHERE assignment_id IN
       (SELECT id FROM assignments WHERE user_id = ANY($1::int[]))`,
    [userIds],
  );
  await pool.query(`DELETE FROM assignments WHERE user_id = ANY($1::int[])`, [userIds]);
  const workshopIds = [workshopId, otherWorkshopId].filter(Boolean);
  await pool.query(
    `DELETE FROM drill_prompts WHERE module_id IN
       (SELECT id FROM workshop_modules WHERE workshop_id = ANY($1::int[]))`,
    [workshopIds],
  );
  await pool.query(`DELETE FROM workshop_instructors WHERE workshop_id = ANY($1::int[])`, [workshopIds]);
  await pool.query(`DELETE FROM workshop_modules WHERE workshop_id = ANY($1::int[])`, [workshopIds]);
  await pool.query(`DELETE FROM workshops WHERE id = ANY($1::int[])`, [workshopIds]);
  await pool.query(`DELETE FROM instructor_profiles WHERE user_id = ANY($1::int[])`, [userIds]);
  await pool.query(`DELETE FROM user_roles WHERE user_id = ANY($1::int[])`, [userIds]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [userIds]);
});

describe("instructor access to student assignment footage", () => {
  it("grants read to the instructor assigned to the workshop", async () => {
    await expect(
      canInstructorAccessSubmission(assignedInstructor.id, objectPath),
    ).resolves.toBe(true);
  });

  it("denies an instructor NOT assigned to the workshop", async () => {
    await expect(
      canInstructorAccessSubmission(unassignedInstructor.id, objectPath),
    ).resolves.toBe(false);
  });

  it("denies an unrelated user id", async () => {
    await expect(
      canInstructorAccessSubmission(student.id, objectPath),
    ).resolves.toBe(false);
  });

  it("denies an object path that is not an assignment submission", async () => {
    await expect(
      canInstructorAccessSubmission(assignedInstructor.id, `/objects/uploads/unrelated-${suffix}`),
    ).resolves.toBe(false);
  });
});

describe("assigned non-admin instructor review flow", () => {
  it("sees the pending submission (with its footage URL) in the queue", async () => {
    const res = await request(appFor(assignedInstructor)).get(
      "/api/instructor/submissions?status=pending",
    );
    expect(res.status).toBe(200);
    const row = res.body.find((a: any) => a.id === assignmentId);
    expect(row).toBeTruthy();
    expect(row.submissionUrl).toBe(`/api/storage${objectPath}`);
  });

  it("does NOT see the submission when unassigned", async () => {
    const res = await request(appFor(unassignedInstructor)).get(
      "/api/instructor/submissions?status=pending",
    );
    expect(res.status).toBe(200);
    expect(res.body.find((a: any) => a.id === assignmentId)).toBeUndefined();
  });

  it("can submit feedback on the reviewed footage", async () => {
    const res = await request(appFor(assignedInstructor))
      .post(`/api/instructor/submissions/${assignmentId}/feedback`)
      .send({ status: "approved", feedbackText: "Clean 30s drill — approved." });
    expect(res.status).toBe(200);

    const { rows } = await pool.query(
      `SELECT a.status, e.feedback_text, e.reviewed_by
         FROM assignments a
         JOIN assignment_extensions e ON e.assignment_id = a.id
        WHERE a.id = $1`,
      [assignmentId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("approved");
    expect(rows[0].feedback_text).toContain("approved");
    expect(rows[0].reviewed_by).toBe(assignedInstructor.id);
  });

  it("rejects feedback from an instructor not assigned to the workshop (403)", async () => {
    const res = await request(appFor(unassignedInstructor))
      .post(`/api/instructor/submissions/${assignmentId}/feedback`)
      .send({ status: "approved", feedbackText: "should not land" });
    expect(res.status).toBe(403);
  });
});

describe("drill creation is scoped to the assigned workshop's own modules", () => {
  it("rejects a module id belonging to a DIFFERENT workshop (404), creating nothing", async () => {
    const res = await request(appFor(assignedInstructor))
      .post(`/api/instructor/workshops/${workshopId}/modules/${otherModuleId}/drills`)
      .send({ prompt: "Cross-workshop drill should not land", maxDurationSeconds: 30 });
    expect(res.status).toBe(404);

    const { rows } = await pool.query(
      `SELECT 1 FROM drill_prompts WHERE module_id = $1`,
      [otherModuleId],
    );
    expect(rows).toHaveLength(0);
  });

  it("accepts a module that belongs to the assigned workshop (201)", async () => {
    const res = await request(appFor(assignedInstructor))
      .post(`/api/instructor/workshops/${workshopId}/modules/${moduleId}/drills`)
      .send({ prompt: "Valid 30s drill", maxDurationSeconds: 30 });
    expect(res.status).toBe(201);
    expect(res.body.moduleId).toBe(moduleId);
  });
});

describe("assigned instructors can read curriculum regardless of membership tier", () => {
  it("free-tier assigned instructor gets the paid workshop detail (200)", async () => {
    // assignedInstructor has tier "free" — teaching must not require paying.
    const res = await request(appFor(assignedInstructor)).get(`/api/workshops/${workshopId}`);
    expect(res.status).toBe(200);
    expect(res.body.modules.length).toBeGreaterThan(0);
  });

  it("free-tier UNASSIGNED instructor is still tier-gated (403)", async () => {
    const res = await request(appFor(unassignedInstructor)).get(`/api/workshops/${otherWorkshopId}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("tier_required");
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { pool } from "@workspace/db";
import assignmentsRouter, { LESSON_REFLECTION_PROMPT } from "./assignments";
import instructorRouter from "./instructor";

type TestUser = { id: number; email: string; username: string };
const suffix = `reflection_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
let users: TestUser[] = [];
let student: TestUser;
let otherStudent: TestUser;
let instructor: TestUser;
let outsider: TestUser;
let workshopId: number;
let moduleId: number;
let blueprintId: number;
let reflectionId: number;

function appFor(user?: TestUser) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as any).dbUser = { ...user, isAdmin: false, tier: "free" };
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", assignmentsRouter, instructorRouter);
  return app;
}

beforeAll(async () => {
  for (const role of ["student", "other", "instructor", "outsider"]) {
    const { rows } = await pool.query<TestUser>(
      "INSERT INTO users (email, username, tier) VALUES ($1, $2, 'free') RETURNING id, email, username",
      [`${suffix}_${role}@example.test`, `${suffix}_${role}`],
    );
    users.push(rows[0]);
  }
  [student, otherStudent, instructor, outsider] = users;
  await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'instructor'), ($2, 'instructor')", [instructor.id, outsider.id]);
  const { rows: profiles } = await pool.query<{ id: number; user_id: number }>(
    "INSERT INTO instructor_profiles (user_id, display_name, mentor_slug, verified) VALUES ($1, $2, $2, true), ($3, $4, $4, true) RETURNING id, user_id",
    [instructor.id, suffix, outsider.id, `${suffix}_outside`],
  );
  const { rows: workshops } = await pool.query<{ id: number }>(
    "INSERT INTO workshops (title, description, tier, category, total_modules, is_published) VALUES ($1, 'Temporary route test', 'academy', 'Visual Art', 2, true) RETURNING id",
    [suffix],
  );
  workshopId = workshops[0].id;
  const { rows: modules } = await pool.query<{ id: number; video_url: string | null }>(
    'INSERT INTO workshop_modules (workshop_id, title, "order", video_url) VALUES ($1, $2, 1, $3), ($1, $4, 2, NULL) RETURNING id, video_url',
    [workshopId, `${suffix}_released`, "/api/storage/objects/test-reflection-lesson", `${suffix}_blueprint`],
  );
  moduleId = modules.find((m) => !!m.video_url)!.id;
  blueprintId = modules.find((m) => !m.video_url)!.id;
  await pool.query("INSERT INTO workshop_instructors (workshop_id, instructor_id) VALUES ($1, $2)", [workshopId, profiles.find((p) => p.user_id === instructor.id)!.id]);
  await pool.query("INSERT INTO enrollments (user_id, workshop_id, status, access_source) VALUES ($1, $2, 'active', 'participant')", [student.id, workshopId]);
});

afterAll(async () => {
  if (workshopId) await pool.query("DELETE FROM workshops WHERE id = $1", [workshopId]);
  for (const user of users) {
    await pool.query("DELETE FROM instructor_profiles WHERE user_id = $1", [user.id]);
    await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
  }
});

const input = () => ({ workshopId, moduleId, responseText: "I tried a new composition and will practice contrast next." });

describe("private lesson reflections", () => {
  it("requires authentication, lesson access, and an active enrollment", async () => {
    expect((await request(appFor()).post("/api/workshop-reflections").send(input())).status).toBe(401);
    expect((await request(appFor(otherStudent)).post("/api/workshop-reflections").send(input())).status).toBe(403);
    // Assigned staff has lesson access but does not have a student enrollment.
    expect((await request(appFor(instructor)).post("/api/workshop-reflections").send(input())).status).toBe(403);
    await pool.query("UPDATE enrollments SET status = 'paused' WHERE user_id = $1 AND workshop_id = $2", [student.id, workshopId]);
    expect((await request(appFor(student)).post("/api/workshop-reflections").send(input())).status).toBe(403);
    await pool.query("UPDATE enrollments SET status = 'active' WHERE user_id = $1 AND workshop_id = $2", [student.id, workshopId]);
  });

  it("rejects blank/oversized responses and unreleased or mismatched lessons", async () => {
    for (const responseText of ["   ", "x".repeat(1501)]) {
      expect((await request(appFor(student)).post("/api/workshop-reflections").send({ ...input(), responseText })).status).toBe(400);
    }
    expect((await request(appFor(student)).post("/api/workshop-reflections").send({ ...input(), moduleId: blueprintId })).status).toBe(409);
    expect((await request(appFor(student)).post("/api/workshop-reflections").send({ ...input(), moduleId: 2147483647 })).status).toBe(400);
  });

  it("saves a text-only lesson response in the owner's portfolio without relaxing drill footage rules", async () => {
    const res = await request(appFor(student)).post("/api/workshop-reflections").send(input());
    expect(res.status).toBe(201);
    reflectionId = res.body.id;
    expect(res.body).toMatchObject({
      userId: student.id, workshopId, moduleId, submissionKind: "lesson_reflection",
      reflectionPrompt: LESSON_REFLECTION_PROMPT, submissionNote: input().responseText, status: "pending", submissionUrl: null,
    });
    const own = await request(appFor(student)).get("/api/assignments");
    expect(own.body.find((entry: { id: number }) => entry.id === reflectionId)?.moduleTitle).toBe(`${suffix}_released`);
    const other = await request(appFor(otherStudent)).get("/api/assignments");
    expect(other.body.some((entry: { id: number }) => entry.id === reflectionId)).toBe(false);
    expect((await request(appFor(otherStudent)).get(`/api/assignments/${reflectionId}`)).status).toBe(403);
    expect((await request(appFor(student)).post("/api/assignments").send({ workshopId, moduleId, submissionNote: "Cannot bypass video requirement" })).status).toBe(400);
  });

  it("allows only the assigned instructor to review, with feedback visible to the student", async () => {
    const queue = await request(appFor(instructor)).get("/api/instructor/submissions?status=pending");
    expect(queue.status).toBe(200);
    expect(queue.body.find((entry: { id: number }) => entry.id === reflectionId)).toMatchObject({
      submissionKind: "lesson_reflection", reflectionPrompt: LESSON_REFLECTION_PROMPT,
    });
    const outsideQueue = await request(appFor(outsider)).get("/api/instructor/submissions?status=pending");
    expect(outsideQueue.status).toBe(200);
    expect(outsideQueue.body.some((entry: { id: number }) => entry.id === reflectionId)).toBe(false);
    expect((await request(appFor(outsider)).post(`/api/instructor/submissions/${reflectionId}/feedback`).send({ status: "approved", feedbackText: "Not permitted" })).status).toBe(403);
    const reviewed = await request(appFor(instructor)).post(`/api/instructor/submissions/${reflectionId}/feedback`).send({ status: "approved", feedbackText: "Try contrast in your next study." });
    expect(reviewed.status).toBe(200);
    const own = await request(appFor(student)).get("/api/assignments");
    expect(own.body.find((entry: { id: number }) => entry.id === reflectionId)).toMatchObject({ status: "approved", feedback: "Try contrast in your next study." });
  });
});

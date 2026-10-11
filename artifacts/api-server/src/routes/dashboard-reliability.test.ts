import express from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import dashboardRouter from "./dashboard";
import habitsRouter from "./habits";
import { apiAdmissionGuard, apiErrorHandler } from "../lib/serverReliability";
import { ObjectStorageService } from "../lib/objectStorage";
import * as streakLogic from "../lib/habitStreak";

// Development-only fixtures, private habits only; always cleaned up.
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const today = new Date().toISOString().slice(0, 10);
const users: number[] = [];
const habits: number[] = [];

function appFor(userId?: number) {
  const app = express();
  app.use("/api", apiAdmissionGuard());
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = userId ? { id: userId } : undefined;
    (req as any).log = { error() {}, warn() {} };
    next();
  });
  app.use("/api", dashboardRouter, habitsRouter);
  app.use(apiErrorHandler);
  return app;
}

beforeAll(async () => {
  vi.spyOn(ObjectStorageService.prototype, "getObjectEntityFile").mockImplementation(async () => ({
    getMetadata: async () => [{
      contentType: "image/jpeg",
      metadata: { "custom:aclPolicy": JSON.stringify({ owner: String(users[0]), visibility: "private" }) },
    }],
  } as any));
  vi.spyOn(ObjectStorageService.prototype, "canAccessObjectEntity").mockResolvedValue(true);
  const created = await pool.query<{ id: number }>(
    `INSERT INTO users(email,username,is_admin) VALUES ($1,$2,false),($3,$4,false) RETURNING id`,
    [`backend_${suffix}@example.test`, `backend_${suffix}`, `backend_other_${suffix}@example.test`, `backend_other_${suffix}`],
  );
  users.push(...created.rows.map((row) => row.id));
  for (const id of users) {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO habits(user_id,name,category,target_minutes,current_streak,longest_streak)
       SELECT $1,'Private QA practice ' || n,'visual_art',10,0,0 FROM generate_series(1,5) n RETURNING id`, [id],
    );
    habits.push(...result.rows.map((row) => row.id));
  }
});

afterAll(async () => {
  try { for (const id of users) await pool.query("DELETE FROM users WHERE id=$1", [id]); }
  finally { vi.restoreAllMocks(); await pool.end(); }
});

describe("dashboard and simultaneous practice sessions", () => {
  it("requires a signed-in user", async () => {
    expect((await request(appFor()).get("/api/dashboard/summary")).status).toBe(401);
  });

  it("handles 20 simultaneous habit writes without losing practice records", async () => {
    const app = appFor(users[0]);
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      request(app).post(`/api/habits/${habits[index % 5]}/log`).send({
        minutesSpent: 10,
        date: today,
        proofUrl: `/api/storage/objects/uploads/backend-proof-${suffix}-${index}`,
        proofMediaType: "image",
      }),
    ));
    expect(results.map((result) => ({ status: result.status, error: result.body.error })))
      .toEqual(Array.from({ length: 20 }, () => ({ status: 201, error: undefined })));
    const stored = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM habit_logs WHERE user_id=$1", [users[0]]);
    expect(stored.rows[0].count).toBe(20);
  });

  it("counts distinct completed habits and preserves account isolation under 50 reads", async () => {
    const apps = users.map(appFor);
    const results = await Promise.all(Array.from({ length: 50 }, (_, index) =>
      request(apps[index % 2]).get("/api/dashboard/summary"),
    ));
    results.forEach((result, index) => {
      expect(result.status).toBe(200);
      expect(result.body.totalHabits).toBe(5);
      expect(result.body.completionRate).toBe(index % 2 === 0 ? 100 : 0);
      expect(result.body.currentStreakDays).toBe(index % 2 === 0 ? 1 : 0);
    });
  });

  it("joins names correctly in the activity feed without crossing account boundaries", async () => {
    const feed = await request(appFor(users[0])).get("/api/dashboard/activity-feed");
    expect(feed.status).toBe(200);
    expect(feed.body.length).toBe(10);
    expect(feed.body.every((item: { description: string }) => item.description.includes("Private QA practice"))).toBe(true);
    expect((await request(appFor(users[1])).get("/api/dashboard/activity-feed")).body).toEqual([]);
  });

  it("rejects habit writes to a different account", async () => {
    expect((await request(appFor(users[1])).post(`/api/habits/${habits[0]}/log`).send({
      minutesSpent: 10, proofUrl: `/api/storage/objects/uploads/backend-proof-${suffix}`, proofMediaType: "image",
    })).status).toBe(404);
  });

  it("rolls back a saved session if its streak update fails", async () => {
    const before = await pool.query("SELECT count(*)::int AS count FROM habit_logs WHERE user_id=$1", [users[0]]);
    const failure = vi.spyOn(streakLogic, "currentHabitStreak").mockImplementationOnce(() => {
      throw Object.assign(new Error("Injected SQL cancellation"), { code: "57014" });
    });
    try {
      const result = await request(appFor(users[0])).post(`/api/habits/${habits[0]}/log`).send({
        minutesSpent: 10, date: today,
        proofUrl: `/api/storage/objects/uploads/backend-proof-${suffix}-rollback`, proofMediaType: "image",
      });
      expect(result.status).toBe(503);
      const after = await pool.query("SELECT count(*)::int AS count FROM habit_logs WHERE user_id=$1", [users[0]]);
      expect(after.rows[0].count).toBe(before.rows[0].count);
    } finally { failure.mockRestore(); }
  });

  it("serializes concurrent historical sessions without overwriting a longer streak", async () => {
    const dates = [1, 2].map((offset) => {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - offset);
      return date.toISOString().slice(0, 10);
    });
    const app = appFor(users[0]);
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      request(app).post(`/api/habits/${habits[0]}/log`).send({
        minutesSpent: 10, date: dates[index % 2],
        proofUrl: `/api/storage/objects/uploads/backend-proof-${suffix}-history-${index}`, proofMediaType: "image",
      }),
    ));
    expect(results.map((result) => result.status)).toEqual(Array(8).fill(201));
    const saved = await pool.query("SELECT current_streak,longest_streak FROM habits WHERE id=$1", [habits[0]]);
    expect(saved.rows[0]).toMatchObject({ current_streak: 3, longest_streak: 3 });
  });
});

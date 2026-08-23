import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import workshopsRouter from "./workshops";

/**
 * Integration coverage for paid-workshop tier gating (Task #64 hardening).
 *
 * The seeded Creator Studio workshops use tier = "academy" while legacy
 * Warehouse-era rows use tier = "workshop". BOTH vocabularies must require
 * the Dedicated Artist (academy) membership — a free user must never be able
 * to fetch modules for, or enroll in, a paid workshop.
 *
 * Test users are created with clerk_id NULL so the membership check resolves
 * from the local tier only (no RevenueCat network calls).
 */

type TestUser = {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  tier: string;
};

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

let freeUser: TestUser;
let academyUser: TestUser;
let legacyWorkshopUser: TestUser;
let freeWorkshopId: number;
let academyWorkshopId: number;
let legacyPaidWorkshopId: number;
let proWorkshopId: number;

function appFor(user: TestUser | null): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) {
      (req as any).dbUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin,
        tier: user.tier,
      };
    }
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", workshopsRouter);
  return app;
}

beforeAll(async () => {
  const { rows: users } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin, tier)
     VALUES ($1, $2, false, 'free'),
            ($3, $4, false, 'academy'),
            ($5, $6, false, 'workshop')
     RETURNING id, email, username, is_admin, tier`,
    [
      `ws_free_${suffix}@example.test`,
      `ws_free_${suffix}`,
      `ws_academy_${suffix}@example.test`,
      `ws_academy_${suffix}`,
      `ws_legacy_${suffix}@example.test`,
      `ws_legacy_${suffix}`,
    ],
  );
  [freeUser, academyUser, legacyWorkshopUser] = users;

  const { rows: ws } = await pool.query<{ id: number; tier: string }>(
    `INSERT INTO workshops (title, description, tier, category, total_modules)
     VALUES ($1, 'test', 'free', 'test', 1),
            ($2, 'test', 'academy', 'test', 1),
            ($3, 'test', 'workshop', 'test', 1),
            ($4, 'test', 'pro', 'test', 1)
     RETURNING id, tier`,
    [
      `WS Free ${suffix}`,
      `WS Academy ${suffix}`,
      `WS Legacy ${suffix}`,
      `WS Pro ${suffix}`,
    ],
  );
  freeWorkshopId = ws.find((w) => w.tier === "free")!.id;
  academyWorkshopId = ws.find((w) => w.tier === "academy")!.id;
  legacyPaidWorkshopId = ws.find((w) => w.tier === "workshop")!.id;
  proWorkshopId = ws.find((w) => w.tier === "pro")!.id;

  // Add a module to the academy workshop so a leak would expose real content.
  await pool.query(
    `INSERT INTO workshop_modules (workshop_id, title, "order") VALUES ($1, 'M1', 1)`,
    [academyWorkshopId],
  );
});

afterAll(async () => {
  const userIds = [freeUser?.id, academyUser?.id, legacyWorkshopUser?.id].filter(Boolean);
  const workshopIds = [freeWorkshopId, academyWorkshopId, legacyPaidWorkshopId, proWorkshopId].filter(Boolean);
  if (userIds.length > 0) {
    await pool.query(`DELETE FROM enrollments WHERE user_id = ANY($1::int[])`, [userIds]);
  }
  if (workshopIds.length > 0) {
    await pool.query(`DELETE FROM workshop_modules WHERE workshop_id = ANY($1::int[])`, [workshopIds]);
    await pool.query(`DELETE FROM workshops WHERE id = ANY($1::int[])`, [workshopIds]);
  }
  if (userIds.length > 0) {
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [userIds]);
  }
});

describe("paid workshop tier gating", () => {
  it("unauthenticated users get 401 for a paid (academy-tier) workshop", async () => {
    const res = await request(appFor(null)).get(`/api/workshops/${academyWorkshopId}`);
    expect(res.status).toBe(401);
  });

  it("free users cannot fetch modules of an academy-tier workshop (403)", async () => {
    const res = await request(appFor(freeUser)).get(`/api/workshops/${academyWorkshopId}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("tier_required");
    expect(res.body.requiredTier).toBe("academy");
  });

  it("free users cannot enroll in an academy-tier workshop (403)", async () => {
    const res = await request(appFor(freeUser)).post(`/api/workshops/${academyWorkshopId}/enroll`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("tier_required");

    const { rows } = await pool.query(
      `SELECT 1 FROM enrollments WHERE user_id = $1 AND workshop_id = $2`,
      [freeUser.id, academyWorkshopId],
    );
    expect(rows).toHaveLength(0);
  });

  it("free users cannot fetch or enroll in a legacy 'workshop'-tier workshop (403)", async () => {
    const get = await request(appFor(freeUser)).get(`/api/workshops/${legacyPaidWorkshopId}`);
    expect(get.status).toBe(403);

    const enroll = await request(appFor(freeUser)).post(`/api/workshops/${legacyPaidWorkshopId}/enroll`);
    expect(enroll.status).toBe(403);
  });

  it("free users CAN fetch and enroll in a free workshop", async () => {
    const get = await request(appFor(freeUser)).get(`/api/workshops/${freeWorkshopId}`);
    expect(get.status).toBe(200);

    const enroll = await request(appFor(freeUser)).post(`/api/workshops/${freeWorkshopId}/enroll`);
    expect(enroll.status).toBe(201);
  });

  it("academy (Dedicated Artist) users can fetch and enroll in an academy-tier workshop", async () => {
    const get = await request(appFor(academyUser)).get(`/api/workshops/${academyWorkshopId}`);
    expect(get.status).toBe(200);
    expect(get.body.modules).toHaveLength(1);

    const enroll = await request(appFor(academyUser)).post(`/api/workshops/${academyWorkshopId}/enroll`);
    expect(enroll.status).toBe(201);
  });

  it("legacy 'workshop'-tier members can access academy-tier workshops (equal rank)", async () => {
    const res = await request(appFor(legacyWorkshopUser)).get(`/api/workshops/${academyWorkshopId}`);
    expect(res.status).toBe(200);
  });

  it("academy users cannot access a pro-tier workshop (403)", async () => {
    const res = await request(appFor(academyUser)).get(`/api/workshops/${proWorkshopId}`);
    expect(res.status).toBe(403);
    expect(res.body.requiredTier).toBe("pro");
  });
});

import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import workshopsRouter from "./workshops";
import workshopVideosRouter from "./workshop-videos";
import storageRouter from "./storage";
import { ensureCreatorStudioSchema } from "../lib/ensureCreatorStudioSchema";
import { ObjectStorageService } from "../lib/objectStorage";

const { activeCustomers, failedCustomers } = vi.hoisted(() => ({
  activeCustomers: new Set<string>(), failedCustomers: new Set<string>(),
}));
vi.mock("../stripeClient", () => ({
  getUncachableStripeClient: async () => ({
    subscriptions: { list: async ({ customer }: { customer: string }) => {
      if (failedCustomers.has(customer)) throw new Error("provider unavailable");
      return { data: activeCustomers.has(customer) ? [{ status: "active", metadata: { tier: "academy" } }] : [] };
    } },
  }),
}));

/**
 * Public teaser/private lesson coverage. Stripe is mocked at the provider
 * boundary; local membership tiers alone deliberately cannot unlock lessons.
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
let adminUser: TestUser;
let freeWorkshopId: number;
let academyWorkshopId: number;
let legacyPaidWorkshopId: number;
let proWorkshopId: number;
let firstModuleId: number;
const fullMediaPath = `/objects/uploads/${randomUUID()}`;
const teaserUrl = `/api/storage/objects/uploads/${randomUUID()}`;
const stripeCustomerId = `cus_workshop_${suffix}`;

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
  app.use("/api", workshopVideosRouter);
  app.use("/api", storageRouter);
  return app;
}

beforeAll(async () => {
  await ensureCreatorStudioSchema();
  vi.spyOn(ObjectStorageService.prototype, "getWorkshopVideoPlaybackURL").mockResolvedValue("https://example.test/temporary-private-playback");
  const { rows: users } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin, tier)
     VALUES ($1, $2, false, 'free'),
            ($3, $4, false, 'academy'),
            ($5, $6, false, 'workshop'),
            ($7, $8, true, 'free')
     RETURNING id, email, username, is_admin, tier`,
    [
      `ws_free_${suffix}@example.test`,
      `ws_free_${suffix}`,
      `ws_academy_${suffix}@example.test`,
      `ws_academy_${suffix}`,
      `ws_legacy_${suffix}@example.test`,
      `ws_legacy_${suffix}`,
      `ws_admin_${suffix}@example.test`,
      `ws_admin_${suffix}`,
    ],
  );
  [freeUser, academyUser, legacyWorkshopUser, adminUser] = users;
  await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [stripeCustomerId, academyUser.id]);
  activeCustomers.add(stripeCustomerId);

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
  await pool.query("UPDATE workshops SET is_published = true, preview_video_url = $1 WHERE id = ANY($2::int[])",
    [teaserUrl, ws.map((workshop) => workshop.id)]);

  // Add two modules so the preview test can verify that later content remains
  // server-side protected rather than merely hidden in the client.
  const modules = await pool.query<{ id: number }>(
    `INSERT INTO workshop_modules (workshop_id, title, "order", description, video_url, preview_video_url)
     VALUES ($1, 'M1', 1, 'Private teaching notes', $2, $3),
            ($1, 'M2 — paid curriculum', 2, 'Private teaching notes', $2, NULL)
     RETURNING id`,
    [academyWorkshopId, `/api/storage${fullMediaPath}`, teaserUrl],
  );
  firstModuleId = modules.rows[0].id;
});

afterAll(async () => {
  vi.restoreAllMocks();
  const userIds = [freeUser?.id, academyUser?.id, legacyWorkshopUser?.id, adminUser?.id].filter(Boolean);
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

describe("public previews and verified lesson access", () => {
  it("anonymous visitors see distinct teasers without receiving full URLs or teaching notes", async () => {
    const res = await request(appFor(null)).get(`/api/workshops/${academyWorkshopId}`);
    expect(res.status).toBe(200);
    expect(res.body.hasFullAccess).toBe(false);
    expect(res.body.previewVideoUrl).toBe(teaserUrl);
    expect(res.body.modules).toHaveLength(2);
    expect(res.body.modules[0]).toMatchObject({ videoUrl: null, previewVideoUrl: teaserUrl, description: null, isLocked: true, hasVideo: true, drills: [] });
    expect(JSON.stringify(res.body)).not.toContain(fullMediaPath);
  });

  it("free users see module metadata, not full lesson content", async () => {
    const res = await request(appFor(freeUser)).get(`/api/workshops/${academyWorkshopId}`);
    expect(res.status).toBe(200);
    expect(res.body.modules).toHaveLength(2);
    expect(res.body.modules[0].title).toBe("M1");
    expect(res.body.modules[1].description).toBeNull();
    expect(res.body.hasFullAccess).toBe(false);
  });

  it("free users cannot enroll in an academy-tier workshop (403)", async () => {
    const res = await request(appFor(freeUser)).post(`/api/workshops/${academyWorkshopId}/enroll`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("lesson_access_required");

    const { rows } = await pool.query(
      `SELECT 1 FROM enrollments WHERE user_id = $1 AND workshop_id = $2`,
      [freeUser.id, academyWorkshopId],
    );
    expect(rows).toHaveLength(0);
  });

  it("free users can preview but cannot enroll in a legacy 'workshop'-tier workshop", async () => {
    const get = await request(appFor(freeUser)).get(`/api/workshops/${legacyPaidWorkshopId}`);
    expect(get.status).toBe(200);

    const enroll = await request(appFor(freeUser)).post(`/api/workshops/${legacyPaidWorkshopId}/enroll`);
    expect(enroll.status).toBe(403);
  });

  it("a free workshop label does not bypass the full-lesson enrollment gate", async () => {
    const get = await request(appFor(freeUser)).get(`/api/workshops/${freeWorkshopId}`);
    expect(get.status).toBe(200);

    const enroll = await request(appFor(freeUser)).post(`/api/workshops/${freeWorkshopId}/enroll`);
    expect(enroll.status).toBe(403);
  });

  it("academy (Dedicated Artist) users can fetch and enroll in an academy-tier workshop", async () => {
    const get = await request(appFor(academyUser)).get(`/api/workshops/${academyWorkshopId}`);
    expect(get.status).toBe(200);
    expect(get.body.modules).toHaveLength(2);
    expect(get.body.hasFullAccess).toBe(true);
    expect(get.body.modules[0].videoUrl).toBeNull();
    expect(get.body.modules[0].description).toBe("Private teaching notes");

    const enroll = await request(appFor(academyUser)).post(`/api/workshops/${academyWorkshopId}/enroll`);
    expect(enroll.status).toBe(201);
    expect(enroll.body.accessSource).toBe("subscription");
  });

  it("an unverified legacy paid tier does not unlock full lessons", async () => {
    const res = await request(appFor(legacyWorkshopUser)).get(`/api/workshops/${academyWorkshopId}`);
    expect(res.status).toBe(200);
    expect(res.body.hasFullAccess).toBe(false);
    expect((await request(appFor(legacyWorkshopUser)).post(`/api/workshops/${academyWorkshopId}/modules/${firstModuleId}/playback`)).status).toBe(403);
  });

  it("verified Dedicated Artist subscribers receive full lesson access regardless of legacy workshop tier labels", async () => {
    const res = await request(appFor(academyUser)).get(`/api/workshops/${proWorkshopId}`);
    expect(res.status).toBe(200);
    expect(res.body.modules).toHaveLength(0);
    expect(res.body.hasFullAccess).toBe(true);
  });

  it("full playback is authenticated and server-gated", async () => {
    const url = `/api/workshops/${academyWorkshopId}/modules/${firstModuleId}/playback`;
    expect((await request(appFor(null)).post(url)).status).toBe(401);
    expect((await request(appFor(freeUser)).post(url)).status).toBe(403);
    const member = await request(appFor(academyUser)).post(url);
    expect(member.status).toBe(200);
    expect(member.body.playbackUrl).toBe("https://example.test/temporary-private-playback");
    expect(new Date(member.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(member.headers["cache-control"]).toContain("no-store");
    expect((await request(appFor(academyUser)).post(`/api/workshops/${freeWorkshopId}/modules/${firstModuleId}/playback`)).status).toBe(404);
  });

  it("cancellation removes lesson access even after subscriber self-enrollment", async () => {
    activeCustomers.delete(stripeCustomerId);
    try {
      const detail = await request(appFor(academyUser)).get(`/api/workshops/${academyWorkshopId}`);
      expect(detail.body.isEnrolled).toBe(true);
      expect(detail.body.hasFullAccess).toBe(false);
      expect((await request(appFor(academyUser)).post(`/api/workshops/${academyWorkshopId}/modules/${firstModuleId}/playback`)).status).toBe(403);
    } finally { activeCustomers.add(stripeCustomerId); }
  });

  it("provider failure fails closed while public previews remain available", async () => {
    failedCustomers.add(stripeCustomerId);
    try {
      const detail = await request(appFor(academyUser)).get(`/api/workshops/${academyWorkshopId}`);
      expect(detail.status).toBe(200);
      expect(detail.body.accessStatus).toBe("unavailable");
      expect(detail.body.previewVideoUrl).toBe(teaserUrl);
      expect((await request(appFor(academyUser)).post(`/api/workshops/${academyWorkshopId}/modules/${firstModuleId}/playback`)).status).toBe(503);
    } finally { failedCustomers.delete(stripeCustomerId); }
  });

  it("only assigned staff can grant matching workshop participant access", async () => {
    const path = `/api/instructor/workshops/${academyWorkshopId}/participants`;
    const input = { username: freeUser.username, status: "active" };
    expect((await request(appFor(freeUser)).post(path).send(input)).status).toBe(403);
    const grant = await request(appFor(adminUser)).post(path).send(input);
    expect(grant.status).toBe(200);
    expect(grant.body.accessSource).toBe("participant");
    expect((await request(appFor(freeUser)).get(`/api/workshops/${academyWorkshopId}`)).body.hasFullAccess).toBe(true);
    expect((await request(appFor(freeUser)).get(`/api/workshops/${freeWorkshopId}`)).body.hasFullAccess).toBe(false);
    expect((await request(appFor(freeUser)).post(`/api/workshops/${academyWorkshopId}/modules/${firstModuleId}/playback`)).status).toBe(200);
    const roster = await request(appFor(adminUser)).get(path);
    expect(roster.body).toContainEqual({ userId: freeUser.id, username: freeUser.username, status: "active" });
    await request(appFor(adminUser)).post(path).send({ ...input, status: "paused" });
    expect((await request(appFor(freeUser)).post(`/api/workshops/${academyWorkshopId}/modules/${firstModuleId}/playback`)).status).toBe(403);
  });

  it("raw storage URLs cannot bypass the gate even for legacy public ACL lesson files", async () => {
    const getFile = vi.spyOn(ObjectStorageService.prototype, "getObjectEntityFile").mockResolvedValue({} as any);
    try {
      const res = await request(appFor(freeUser)).get(`/api/storage${fullMediaPath}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("lesson_access_required");
    } finally { getFile.mockRestore(); }
  });

  it("unpublished workshops are invisible to the public, but remain editable by staff", async () => {
    await pool.query("UPDATE workshops SET is_published = false WHERE id = $1", [freeWorkshopId]);
    try {
      expect((await request(appFor(null)).get(`/api/workshops/${freeWorkshopId}`)).status).toBe(404);
      const list = await request(appFor(null)).get("/api/workshops");
      expect(list.body.some((workshop: { id: number }) => workshop.id === freeWorkshopId)).toBe(false);
      expect((await request(appFor(adminUser)).get(`/api/workshops/${freeWorkshopId}`)).status).toBe(200);
    } finally { await pool.query("UPDATE workshops SET is_published = true WHERE id = $1", [freeWorkshopId]); }
  });

  it("staff cannot attach arbitrary public URLs or use full lesson files as teasers", async () => {
    const path = `/api/instructor/workshops/${academyWorkshopId}/modules/${firstModuleId}`;
    expect((await request(appFor(adminUser)).patch(path).send({ videoUrl: "https://example.test/full.mp4" })).status).toBe(400);
    await pool.query(
      `INSERT INTO workshop_video_uploads (workshop_id, user_id, object_path, media_path, kind, content_type, expected_size, ready_at)
       VALUES ($1, $2, $3, $4, 'lesson', 'video/mp4', 12, now())`,
      [academyWorkshopId, adminUser.id, `/objects/uploads/pending/workshop/${randomUUID()}`, fullMediaPath],
    );
    expect((await request(appFor(adminUser)).patch(path).send({ previewVideoUrl: `/api/storage${fullMediaPath}` })).status).toBe(400);
    expect((await request(appFor(adminUser)).patch(path).send({ videoUrl: `/api/storage${fullMediaPath}` })).status).toBe(200);
  });

  it("video uploads enforce assigned staff, accepted MIME types and preview size before issuing URLs", async () => {
    const path = `/api/instructor/workshops/${academyWorkshopId}/videos/request-upload`;
    expect((await request(appFor(freeUser)).post(path).send({ kind: "lesson", contentType: "video/mp4", size: 12 })).status).toBe(403);
    expect((await request(appFor(adminUser)).post(path).send({ kind: "lesson", contentType: "text/html", size: 12 })).status).toBe(400);
    expect((await request(appFor(adminUser)).post(path).send({ kind: "preview", contentType: "video/mp4", size: 50 * 1024 * 1024 + 1 })).status).toBe(400);
  });

  it("the last teaser cannot be cleared while publishing and disappears from public catalog when unpublished", async () => {
    const path = `/api/instructor/workshops/${freeWorkshopId}`;
    expect((await request(appFor(adminUser)).patch(path).send({ previewVideoUrl: null })).status).toBe(400);
    expect((await request(appFor(adminUser)).patch(path).send({ previewVideoUrl: null, isPublished: false })).status).toBe(200);
  });
});

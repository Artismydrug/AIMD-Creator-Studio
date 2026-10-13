import express from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  communityDirectoryAccountVisibility,
  communityMemberVisibility,
} from "../lib/communityMemberVisibility";
import usersRouter from "./users";
import postsRouter from "./studio-posts";

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const app = express();
app.use((req, _res, next) => {
  const viewerUserId = Number(req.header("x-test-viewer-id"));
  if (Number.isInteger(viewerUserId) && viewerUserId > 0) {
    Object.assign(req, { dbUser: { id: viewerUserId } });
  }
  next();
});
app.use("/api", usersRouter);
app.use("/api", postsRouter);
let memberIds: number[] = [];
let automatedAccountIds: number[] = [];

beforeAll(async () => {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO users (username, email, clerk_id, replit_id)
     VALUES ($1, $2, $3, NULL), ($4, $5, NULL, $6)
     RETURNING id`,
    [
      `member_${suffix}`, `member_${suffix}@example.test`, `user_member_${suffix}`,
      `legacy_${suffix}`, `legacy_${suffix}@example.test`, `legacy_member_${suffix}`,
    ],
  );
  memberIds = result.rows.map((row) => row.id);
  const automatedHandles = [
    `clerk_test_${suffix}`,
    `account_delete_${suffix}`,
    `reflection_instructor_${suffix}`,
    `social_recipient_${suffix}`,
    `social_sender_${suffix}`,
    `test_user_${suffix}`,
    `test_account_${suffix}`,
    `mock_user_${suffix}`,
    `mock_account_${suffix}`,
    `automated_test_${suffix}`,
    `e2e_test_${suffix}`,
    `playwright_test_${suffix}`,
  ];
  const automatedUsers = await pool.query<{ id: number }>(
    `INSERT INTO users (username, email, clerk_id)
     SELECT username, username || '@example.test', 'user_directory_filter_' || username
     FROM unnest($1::text[]) AS accounts(username)
     RETURNING id`,
    [automatedHandles],
  );
  automatedAccountIds = automatedUsers.rows.map((row) => row.id);
  await pool.query(
    `INSERT INTO studio_posts (user_id, caption, tags)
     VALUES ($1, $2, '{}'), ($3, $4, '{}')`,
    [memberIds[0], `Real member post ${suffix}`, memberIds[1], `Second real member post ${suffix}`],
  );
  await pool.query(
    "INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)",
    [memberIds[0], memberIds[1]],
  );
});

afterAll(async () => {
  const createdIds = [...memberIds, ...automatedAccountIds];
  if (!createdIds.length) return;
  await pool.query(
    "DELETE FROM user_follows WHERE follower_id = ANY($1::int[]) OR following_id = ANY($1::int[])",
    [createdIds],
  );
  await pool.query("DELETE FROM studio_posts WHERE user_id = ANY($1::int[])", [createdIds]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [createdIds]);
});

describe("legacy sample profile visibility", () => {
  it.each([
    { username: "Alex Rivera", clerk: null, legacy: null, visible: false },
    { username: "Maya Chen", clerk: "", legacy: "", visible: false },
    { username: "Alex Rivera", clerk: "user_claimed", legacy: null, visible: true },
    { username: "Maya Chen", clerk: null, legacy: "real_legacy_identity", visible: true },
    { username: "ReleaseTesterFan", clerk: "user_real", legacy: null, visible: true },
    { username: "An imported real member", clerk: null, legacy: null, visible: true },
  ])("preserves genuine accounts and excludes only unclaimed seed profiles: $username ($visible)", async (entry) => {
    const predicate = communityMemberVisibility({
      username: sql`${entry.username}::text`,
      clerkId: sql`${entry.clerk}::text`,
      replitId: sql`${entry.legacy}::text`,
    });
    const result = await db.execute(sql`SELECT ${predicate} AS visible`);
    expect(result.rows[0]?.visible).toBe(entry.visible);
  });

  it.each([
    "clerk_test_fake",
    "account_delete_fake",
    "reflection_instructor_fake",
    "social_recipient_fake",
    "social_sender_fake",
    "test_user_fake",
    "test_account_fake",
    "mock_user_fake",
    "mock_account_fake",
    "automated_test_fake",
    "e2e_test_fake",
    "playwright_test_fake",
  ])("hides system-generated directory handle %s", async (username) => {
    const predicate = communityDirectoryAccountVisibility(sql`${username}::text`);
    const result = await db.execute(sql`SELECT ${predicate} AS visible`);
    expect(result.rows[0]?.visible).toBe(false);
  });

  it.each(["@ponchotheartist", "ReleaseTesterFan", "test_artist_123"])(
    "preserves genuine or non-system test-like handle %s",
    async (username) => {
      const predicate = communityDirectoryAccountVisibility(sql`${username}::text`);
      const result = await db.execute(sql`SELECT ${predicate} AS visible`);
      expect(result.rows[0]?.visible).toBe(true);
    },
  );

  it("keeps newly registered and legacy members visible even with blank profile fields", async () => {
    const response = await request(app).get("/api/directory");
    expect(response.status).toBe(200);
    const visibleIds = response.body.map((member: { id: number }) => member.id);
    for (const id of memberIds) expect(visibleIds).toContain(id);
    for (const id of automatedAccountIds) expect(visibleIds).not.toContain(id);
  });

  it("retains real public profiles and posts", async () => {
    const profile = await request(app).get(`/api/users/${memberIds[0]}/profile`);
    expect(profile.status).toBe(200);
    expect(profile.body.id).toBe(memberIds[0]);
    const posts = await request(app).get(`/api/studio-posts?userId=${memberIds[0]}`);
    expect(posts.status).toBe(200);
    expect(posts.body).toHaveLength(1);
    expect(posts.body[0].userId).toBe(memberIds[0]);
  });

  it("returns every visible creator in All and limits Following to followed creators", async () => {
    const all = await request(app)
      .get("/api/studio-posts?followingOnly=false")
      .set("x-test-viewer-id", String(memberIds[0]));
    expect(all.status).toBe(200);
    expect(all.body.map((post: { userId: number }) => post.userId))
      .toEqual(expect.arrayContaining(memberIds));

    const following = await request(app)
      .get("/api/studio-posts?followingOnly=true")
      .set("x-test-viewer-id", String(memberIds[0]));
    expect(following.status).toBe(200);
    expect(following.body.map((post: { userId: number }) => post.userId)).toEqual([memberIds[1]]);
  });

  it("defaults to All, rejects invalid filter values, and requires sign-in for Following", async () => {
    const all = await request(app).get("/api/studio-posts");
    expect(all.status).toBe(200);
    expect(all.body.map((post: { userId: number }) => post.userId)).toEqual(expect.arrayContaining(memberIds));
    expect((await request(app).get("/api/studio-posts?followingOnly=invalid")).status).toBe(400);
    expect((await request(app).get("/api/studio-posts?followingOnly=true")).status).toBe(401);
  });
});

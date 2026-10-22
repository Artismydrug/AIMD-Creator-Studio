import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import { ensureCreatorStudioSchema } from "../lib/ensureCreatorStudioSchema";
import studioPostsRouter from "./studio-posts";
import usersRouter from "./users";

type TestUser = {
  id: number;
  email: string;
  username: string;
};

const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
let viewer: TestUser;
let followedCreator: TestUser;
let otherCreator: TestUser;

function appFor(user?: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) {
      (req as any).dbUser = { id: user.id, email: user.email, username: user.username };
    }
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", usersRouter);
  app.use("/api", studioPostsRouter);
  return app;
}

beforeAll(async () => {
  await ensureCreatorStudioSchema();
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username)
     VALUES ($1, $2), ($3, $4), ($5, $6)
     RETURNING id, email, username`,
    [
      `social_viewer_${suffix}@example.test`,
      `social_viewer_${suffix}`,
      `social_followed_${suffix}@example.test`,
      `social_followed_${suffix}`,
      `social_other_${suffix}@example.test`,
      `social_other_${suffix}`,
    ],
  );
  [viewer, followedCreator, otherCreator] = rows;
  await pool.query(
    `INSERT INTO studio_posts (user_id, caption, tags)
     VALUES ($1, $2, '{}'), ($3, $4, '{}')`,
    [
      followedCreator.id,
      `Followed post ${suffix}`,
      otherCreator.id,
      `Other post ${suffix}`,
    ],
  );
});

afterAll(async () => {
  const ids = [viewer?.id, followedCreator?.id, otherCreator?.id].filter(Boolean);
  if (ids.length) {
    await pool.query("DELETE FROM user_follows WHERE follower_id = ANY($1::int[]) OR following_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM studio_posts WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
  }
});

describe("social profiles and following", () => {
  it("requires authentication for follows and Following Only", async () => {
    await expect(
      request(appFor()).post(`/api/users/${followedCreator.id}/follow`),
    ).resolves.toMatchObject({ status: 401 });
    await expect(
      request(appFor()).get("/api/studio-posts?followingOnly=true"),
    ).resolves.toMatchObject({ status: 401 });
  });

  it("rejects self-follows and creates an idempotent directed relationship", async () => {
    const selfFollow = await request(appFor(viewer)).post(`/api/users/${viewer.id}/follow`);
    expect(selfFollow.status).toBe(400);

    const firstFollow = await request(appFor(viewer)).post(`/api/users/${followedCreator.id}/follow`);
    expect(firstFollow.status).toBe(200);
    expect(firstFollow.body).toMatchObject({
      targetUserId: followedCreator.id,
      followerCount: 1,
      followingCount: 0,
      followedByMe: true,
    });

    const secondFollow = await request(appFor(viewer)).post(`/api/users/${followedCreator.id}/follow`);
    expect(secondFollow.status).toBe(200);
    expect(secondFollow.body.followerCount).toBe(1);

    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM user_follows
       WHERE follower_id = $1 AND following_id = $2`,
      [viewer.id, followedCreator.id],
    );
    expect(rows[0].count).toBe(1);
  });

  it("returns only followed creators in Following Only and clears it after unfollow", async () => {
    const feed = await request(appFor(viewer)).get("/api/studio-posts?followingOnly=true");
    expect(feed.status).toBe(200);
    expect(feed.body.some((post: { userId: number }) => post.userId === followedCreator.id)).toBe(true);
    expect(feed.body.some((post: { userId: number }) => post.userId === otherCreator.id)).toBe(false);

    const removed = await request(appFor(viewer)).delete(`/api/users/${followedCreator.id}/follow`);
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ followedByMe: false, followerCount: 0 });

    const removedAgain = await request(appFor(viewer)).delete(`/api/users/${followedCreator.id}/follow`);
    expect(removedAgain.status).toBe(200);
    expect(removedAgain.body).toMatchObject({ followedByMe: false, followerCount: 0 });

    const emptyFeed = await request(appFor(viewer)).get("/api/studio-posts?followingOnly=true");
    expect(emptyFeed.status).toBe(200);
    expect(emptyFeed.body.some((post: { userId: number }) => post.userId === followedCreator.id)).toBe(false);
  });

  it("returns public profile counts without email, identity IDs, or private account fields", async () => {
    await request(appFor(viewer)).post(`/api/users/${followedCreator.id}/follow`);

    const profile = await request(appFor(viewer)).get(`/api/users/${followedCreator.id}/profile`);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      id: followedCreator.id,
      followerCount: 1,
      followingCount: 0,
      followedByMe: true,
    });
    for (const privateField of [
      "email",
      "firstName",
      "lastName",
      "clerkId",
      "replitId",
      "stripeCustomerId",
      "isAdmin",
      "timezone",
    ]) {
      expect(profile.body).not.toHaveProperty(privateField);
    }

    const arbitraryAvatar = await request(appFor(viewer))
      .patch("/api/users/me")
      .send({ avatarUrl: "/api/storage/objects/uploads/not-owned-or-public" });
    expect(arbitraryAvatar.status).toBe(400);
  });
});
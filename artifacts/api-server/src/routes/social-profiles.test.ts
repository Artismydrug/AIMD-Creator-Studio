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

  it("persists ordered inquiry service options and exposes them in the creator profile", async () => {
    const options = ["Leather Work", "Mural", "Painting"];
    const saved = await request(appFor(viewer))
      .patch("/api/users/me")
      .send({
        bio: "Paint, tattoos, and community art.",
        portfolioUrl: "https://portfolio.example/artist",
        instagramUrl: "https://www.instagram.com/artist.studio/",
        tiktokUrl: "https://www.tiktok.com/@artiststudio",
        profileAccentColor: "violet",
        inquiryOptions: options,
        bookingOpen: true,
      });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      bio: "Paint, tattoos, and community art.",
      portfolioUrl: "https://portfolio.example/artist",
      instagramUrl: "https://www.instagram.com/artist.studio/",
      tiktokUrl: "https://www.tiktok.com/@artiststudio",
      profileAccentColor: "violet",
      inquiryOptions: options,
      bookingOpen: true,
    });

    const profile = await request(appFor()).get(`/api/users/${viewer.id}/profile`);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      bio: "Paint, tattoos, and community art.",
      portfolioUrl: "https://portfolio.example/artist",
      instagramUrl: "https://www.instagram.com/artist.studio/",
      tiktokUrl: "https://www.tiktok.com/@artiststudio",
      profileAccentColor: "violet",
      inquiryOptions: options,
      bookingOpen: true,
    });
    const directory = await request(appFor()).get("/api/directory");
    expect(directory.body.find((member: { id: number }) => member.id === viewer.id).inquiryOptions).toEqual(options);

    const duplicateOptions = await request(appFor(viewer))
      .patch("/api/users/me")
      .send({ inquiryOptions: ["Mural", " mural "] });
    expect(duplicateOptions.status).toBe(400);
    const persisted = await request(appFor(viewer)).get("/api/users/me");
    expect(persisted.body).toMatchObject({
      bio: "Paint, tattoos, and community art.",
      instagramUrl: "https://www.instagram.com/artist.studio/",
      profileAccentColor: "violet",
      inquiryOptions: options,
    });

    const closeAndClear = await request(appFor(viewer))
      .patch("/api/users/me")
      .send({ inquiryOptions: [], bookingOpen: false });
    expect(closeAndClear.status).toBe(200);
    const reopenWithoutServices = await request(appFor(viewer))
      .patch("/api/users/me")
      .send({ bookingOpen: true });
    expect(reopenWithoutServices.status).toBe(400);
  });

  it("rejects mismatched social hosts, website credentials, and unsupported brand colors", async () => {
    for (const data of [
      { instagramUrl: "https://tiktok.com/@not-instagram" },
      { tiktokUrl: "https://tiktok.com.evil.example/@artist" },
      { portfolioUrl: "https://artist:secret@portfolio.example/" },
      { profileAccentColor: "not-a-palette-color" },
    ]) {
      const response = await request(appFor(viewer)).patch("/api/users/me").send(data);
      expect(response.status).toBe(400);
    }
    const persisted = await request(appFor(viewer)).get("/api/users/me");
    expect(persisted.body).toMatchObject({
      instagramUrl: "https://www.instagram.com/artist.studio/",
      tiktokUrl: "https://www.tiktok.com/@artiststudio",
      profileAccentColor: "violet",
    });
  });
});
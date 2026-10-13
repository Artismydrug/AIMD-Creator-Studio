import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pool } from "@workspace/db";
import postsRouter from "./studio-posts";

const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
let ownerId: number;
let otherId: number;

function appFor(userId?: number) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) Object.assign(req, { dbUser: { id: userId } });
    next();
  });
  app.use("/api", postsRouter);
  return app;
}

async function createPost() {
  const result = await pool.query(
    `INSERT INTO studio_posts (user_id, caption, image_url, media_type, tags)
     VALUES ($1, 'Original caption', $2, 'audio', ARRAY['music', 'practice'])
     RETURNING *`,
    [ownerId, `/api/storage/objects/post-actions-test-${suffix}.mp3`],
  );
  return result.rows[0];
}

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, username) VALUES ($1, $2), ($3, $4) RETURNING id`,
    [`post-owner-${suffix}@example.com`, `post_owner_${suffix}`,
      `post-viewer-${suffix}@example.com`, `post_viewer_${suffix}`],
  );
  [ownerId, otherId] = result.rows.map((row) => row.id);
});

afterAll(async () => {
  if (ownerId && otherId) await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [[ownerId, otherId]]);
});

describe("owner-only post actions", () => {
  it("edits the caption without changing media, tags, author, or creation time", async () => {
    const original = await createPost();
    const response = await request(appFor(ownerId))
      .patch(`/api/studio-posts/${original.id}`)
      .send({ caption: "  Updated vocal practice  " });
    expect(response.status).toBe(200);
    expect(response.body.caption).toBe("Updated vocal practice");
    expect(response.body.userId).toBe(ownerId);
    expect(response.body.imageUrl).toBe(original.image_url);
    expect(response.body.mediaType).toBe("audio");
    expect(response.body.tags).toEqual(["music", "practice"]);
    expect(new Date(response.body.createdAt).getTime()).toBe(original.created_at.getTime());
    const result = await pool.query("SELECT caption FROM studio_posts WHERE id = $1", [original.id]);
    expect(result.rows[0].caption).toBe("Updated vocal practice");
  });

  it.each([undefined, "other"] as const)("rejects editing by %s without changing the post", async (viewer) => {
    const post = await createPost();
    const response = await request(appFor(viewer ? otherId : undefined))
      .patch(`/api/studio-posts/${post.id}`).send({ caption: "Not mine" });
    expect(response.status).toBe(viewer ? 404 : 401);
    const result = await pool.query("SELECT caption FROM studio_posts WHERE id = $1", [post.id]);
    expect(result.rows[0].caption).toBe("Original caption");
  });

  it.each([
    {},
    { caption: "" },
    { caption: "   \n " },
    { caption: "x".repeat(5001) },
    { caption: "Replacement", imageUrl: "https://example.com/other-file.mp3" },
    { caption: "Replacement", userId: 1 },
  ])("rejects invalid caption updates and non-caption fields", async (body) => {
    const post = await createPost();
    const response = await request(appFor(ownerId)).patch(`/api/studio-posts/${post.id}`).send(body);
    expect(response.status).toBe(400);
    const result = await pool.query("SELECT caption FROM studio_posts WHERE id = $1", [post.id]);
    expect(result.rows[0].caption).toBe("Original caption");
  });

  it("allows longer existing writing to be corrected", async () => {
    const post = await createPost();
    const response = await request(appFor(ownerId)).patch(`/api/studio-posts/${post.id}`).send({ caption: "x".repeat(5000) });
    expect(response.status).toBe(200);
    expect(response.body.caption).toHaveLength(5000);
  });

  it.each([undefined, "other"] as const)("rejects deletion by %s and preserves the post", async (viewer) => {
    const post = await createPost();
    const response = await request(appFor(viewer ? otherId : undefined)).delete(`/api/studio-posts/${post.id}`);
    expect(response.status).toBe(viewer ? 404 : 401);
    const result = await pool.query("SELECT id FROM studio_posts WHERE id = $1", [post.id]);
    expect(result.rows).toHaveLength(1);
  });

  it("deletes only the selected owned post and removes it from the profile list", async () => {
    const selected = await createPost();
    const retained = await createPost();
    const response = await request(appFor(ownerId)).delete(`/api/studio-posts/${selected.id}`);
    expect(response.status).toBe(204);
    const result = await pool.query("SELECT id FROM studio_posts WHERE id = ANY($1::int[])", [[selected.id, retained.id]]);
    expect(result.rows.map((row) => row.id)).toEqual([retained.id]);
    const profile = await request(appFor(ownerId)).get(`/api/studio-posts?userId=${ownerId}&limit=100`);
    expect(profile.status).toBe(200);
    expect(profile.body.some((post: { id: number }) => post.id === selected.id)).toBe(false);
  });
});

it("keeps owner controls in feed and profile, with explicit cancellation that never submits", () => {
  const actions = readFileSync(new URL("../../../aimd-network/components/PostOwnerActions.tsx", import.meta.url), "utf8");
  const cards = readFileSync(new URL("../../../aimd-network/components/PostCard.tsx", import.meta.url), "utf8");
  const profile = readFileSync(new URL("../../../aimd-network/app/creator/[id].tsx", import.meta.url), "utf8");
  const ownStudio = readFileSync(new URL("../../../aimd-network/app/profile.tsx", import.meta.url), "utf8");
  expect(actions).toContain("if (!isOwner) return null");
  expect(actions).toContain("dialog !== 'delete' || submitting.current");
  expect(actions).toContain("testID={`cancel-post-action-${post.id}`}");
  expect(actions).toContain("disabled={busy} onPress={close}");
  const close = actions.split("const close = () => {")[1].split("};")[0];
  expect(close).toContain("changeDialog(null)");
  expect(close).not.toContain("mutate");
  expect(actions).not.toContain("window.confirm");
  expect(cards.match(/<PostOwnerActions/g)).toHaveLength(2);
  expect(profile).toContain("<PostOwnerActions post={post} currentUserId={me?.id}");
  expect(ownStudio).toContain("<PostOwnerActions post={post} currentUserId={me.id}");
});

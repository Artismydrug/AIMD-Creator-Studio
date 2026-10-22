import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import postsRouter from "./studio-posts";
import usersRouter from "./users";

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
  app.use("/api", usersRouter);
  return app;
}

async function createTaggedPost(tags: string[] = []) {
  const result = await pool.query(
    `INSERT INTO studio_posts (user_id, caption, tags)
     VALUES ($1, 'Portfolio category test', $2::text[])
     RETURNING id`,
    [ownerId, tags],
  );
  return result.rows[0].id as number;
}

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, username) VALUES ($1, $2), ($3, $4) RETURNING id`,
    [`portfolio-owner-${suffix}@example.com`, `portfolio_owner_${suffix}`,
      `portfolio-other-${suffix}@example.com`, `portfolio_other_${suffix}`],
  );
  [ownerId, otherId] = result.rows.map((row) => row.id);
});

afterAll(async () => {
  if (ownerId && otherId) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [[ownerId, otherId]]);
  }
});

describe("creator portfolio categories", () => {
  it("adds, renames, reorders, and removes categories without deleting artwork", async () => {
    const postId = await createTaggedPost(["tattoo"]);
    const app = appFor(ownerId);
    const created = await request(app)
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [
        { name: "Tattoos", legacyName: "Tattoos" },
        { name: "Paintings" },
      ] });
    expect(created.status).toBe(200);
    expect(created.body.map((category: { name: string }) => category.name)).toEqual(["Tattoos", "Paintings"]);

    const [tattoos, paintings] = created.body as { id: number; name: string; position: number }[];
    const assigned = await pool.query(
      "SELECT portfolio_category_id FROM studio_posts WHERE id = $1",
      [postId],
    );
    expect(assigned.rows[0].portfolio_category_id).toBe(tattoos.id);

    const createdWithCategory = await request(app)
      .post("/api/studio-posts")
      .send({ caption: "New categorized work", tags: [], portfolioCategoryId: tattoos.id });
    expect(createdWithCategory.status).toBe(201);
    expect(createdWithCategory.body.portfolioCategoryId).toBe(tattoos.id);

    const reassigned = await request(app)
      .patch(`/api/studio-posts/${postId}/category`)
      .send({ portfolioCategoryId: paintings.id });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.portfolioCategoryId).toBe(paintings.id);

    const renamedAndReordered = await request(app)
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [
        { id: paintings.id, name: "Painting" },
        { id: tattoos.id, name: "Tattoo Work" },
      ] });
    expect(renamedAndReordered.status).toBe(200);
    expect(renamedAndReordered.body).toEqual([
      { id: paintings.id, name: "Painting", position: 0 },
      { id: tattoos.id, name: "Tattoo Work", position: 1 },
    ]);

    const removed = await request(app)
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [{ id: tattoos.id, name: "Tattoo Work" }] });
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual([{ id: tattoos.id, name: "Tattoo Work", position: 0 }]);
    const retainedWork = await pool.query(
      "SELECT id, portfolio_category_id FROM studio_posts WHERE id = $1",
      [postId],
    );
    expect(retainedWork.rows).toEqual([{ id: postId, portfolio_category_id: null }]);
  });

  it("keeps an intentionally empty category list and rejects another creator's category", async () => {
    const postId = await createTaggedPost(["painting"]);
    const app = appFor(ownerId);
    const saved = await request(app)
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [{ name: "Painting" }] });
    const categoryId = saved.body[0].id as number;

    const forbiddenAssignment = await request(appFor(otherId))
      .patch(`/api/studio-posts/${postId}/category`)
      .send({ portfolioCategoryId: categoryId });
    expect(forbiddenAssignment.status).toBe(404);

    const removedAll = await request(app)
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [] });
    expect(removedAll.status).toBe(200);
    expect(removedAll.body).toEqual([]);

    const profile = await request(app).get(`/api/users/${ownerId}/profile`);
    expect(profile.status).toBe(200);
    expect(profile.body.portfolioCategories).toEqual([]);
    const retained = await pool.query("SELECT id FROM studio_posts WHERE id = $1", [postId]);
    expect(retained.rows).toHaveLength(1);
  });

  it("requires a signed-in owner and rejects duplicate names", async () => {
    const unauthorized = await request(appFor())
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [{ name: "Painting" }] });
    expect(unauthorized.status).toBe(401);

    const duplicates = await request(appFor(ownerId))
      .put("/api/users/me/portfolio-categories")
      .send({ categories: [{ name: "Painting" }, { name: " painting " }] });
    expect(duplicates.status).toBe(400);
  });
});

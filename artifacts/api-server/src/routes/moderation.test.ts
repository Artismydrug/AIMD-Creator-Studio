import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import { ensureCreatorStudioSchema } from "../lib/ensureCreatorStudioSchema";
import moderationRouter from "./moderation";
import studioPostsRouter from "./studio-posts";

const { revoke } = vi.hoisted(() => ({ revoke: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: class { revokePublicObjectEntityIfOwned = revoke; },
}));

type TestUser = { id: number; isAdmin: boolean };
const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
let admin: TestUser;
let author: TestUser;
let recipient: TestUser;
let outsider: TestUser;
let conversationId: number;
let messageId: number;

function appFor(user?: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).dbUser = user; next(); });
  app.use("/api", moderationRouter);
  app.use("/api", studioPostsRouter);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: error.message });
  });
  return app;
}

async function makePost(mediaUrl: string | null = null): Promise<number> {
  const { rows } = await pool.query(
    "INSERT INTO studio_posts (user_id, caption, image_url, tags) VALUES ($1, $2, $3, '{}') RETURNING id",
    [author.id, `Safety fixture ${suffix}`, mediaUrl],
  );
  return rows[0].id;
}

async function reportPost(postId: number): Promise<number> {
  const result = await request(appFor(recipient)).post("/api/moderation/reports").send({ postId, reason: "harassment" });
  expect(result.status).toBe(201);
  expect(result.body.reportedUserId).toBe(author.id);
  return result.body.id;
}

beforeAll(async () => {
  await ensureCreatorStudioSchema();
  const { rows } = await pool.query(
    `INSERT INTO users (email, username, is_admin) VALUES
       ($1, $2, true), ($3, $4, false), ($5, $6, false), ($7, $8, false)
     RETURNING id, is_admin AS "isAdmin"`,
    ["admin", "author", "recipient", "outsider"].flatMap((name) => [
      `safety_${name}_${suffix}@example.test`, `safety_${name}_${suffix}`,
    ]),
  );
  [admin, author, recipient, outsider] = rows;
  const conversation = await pool.query("INSERT INTO conversations DEFAULT VALUES RETURNING id");
  conversationId = conversation.rows[0].id;
  await pool.query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)", [
    conversationId, author.id, recipient.id,
  ]);
  const message = await pool.query(
    "INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3) RETURNING id",
    [conversationId, author.id, `Private safety fixture ${suffix}`],
  );
  messageId = message.rows[0].id;
});

afterAll(async () => {
  const ids = [admin?.id, author?.id, recipient?.id, outsider?.id].filter(Boolean);
  if (!ids.length) return;
  await pool.query("DELETE FROM content_reports WHERE reporter_id = ANY($1::int[])", [ids]);
  if (conversationId) await pool.query("DELETE FROM conversations WHERE id = $1", [conversationId]);
  await pool.query("DELETE FROM studio_posts WHERE user_id = ANY($1::int[])", [ids]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
});

describe("staff moderation and report privacy", () => {
  it("saves a post report and its owner without a two-target constraint failure", async () => {
    const id = await reportPost(await makePost());
    const list = await request(appFor(admin)).get("/api/moderation/reports");
    expect(list.status).toBe(200);
    expect(list.body.find((r: any) => r.id === id)).toMatchObject({
      reportedUserId: author.id, contentText: `Safety fixture ${suffix}`, reviewHistory: [],
    });
  });

  it("allows a participant to report a private message but hides it from outsiders", async () => {
    const authorized = await request(appFor(recipient)).post("/api/moderation/reports")
      .send({ messageId, reason: "harassment" });
    expect(authorized.status).toBe(201);
    const unauthorized = await request(appFor(outsider)).post("/api/moderation/reports")
      .send({ messageId, reason: "harassment" });
    expect(unauthorized.status).toBe(404);
    const adminWithoutParticipation = await request(appFor(admin)).post("/api/moderation/reports")
      .send({ messageId, reason: "harassment" });
    expect(adminWithoutParticipation.status).toBe(404);
  });

  it("requires authentication/admin privileges for staff operations", async () => {
    const id = await reportPost(await makePost());
    expect((await request(appFor()).get("/api/moderation/reports")).status).toBe(401);
    expect((await request(appFor(outsider)).get("/api/moderation/reports")).status).toBe(403);
    expect((await request(appFor(outsider)).patch(`/api/moderation/reports/${id}`)
      .send({ action: "remove_content", note: "Not authorized" })).status).toBe(403);
  });

  it("rejects own-content, multiple targets, blank notes, and unknown actions", async () => {
    const postId = await makePost();
    expect((await request(appFor(author)).post("/api/moderation/reports")
      .send({ postId, reason: "spam" })).status).toBe(400);
    expect((await request(appFor(recipient)).post("/api/moderation/reports")
      .send({ postId, userId: author.id, reason: "spam" })).status).toBe(400);
    const id = await reportPost(postId);
    for (const body of [{ action: "resolve", note: " " }, { action: "ban", note: "Check" }]) {
      expect((await request(appFor(admin)).patch(`/api/moderation/reports/${id}`).send(body)).status).toBe(400);
    }
  });

  it("persists review history, closes a report, and rejects stale staff actions", async () => {
    const id = await reportPost(await makePost());
    const reviewing = await request(appFor(admin)).patch(`/api/moderation/reports/${id}`)
      .send({ action: "review", note: "Checking context" });
    expect(reviewing.status).toBe(200);
    expect(reviewing.body.status).toBe("reviewing");
    const closed = await request(appFor(admin)).patch(`/api/moderation/reports/${id}`)
      .send({ action: "resolve", note: "Discussed with participants" });
    expect(closed.status).toBe(200);
    expect(closed.body.reviewHistory).toHaveLength(2);
    expect(closed.body.reviewHistory[1]).toMatchObject({ action: "resolve", reviewerId: admin.id });
    expect((await request(appFor(admin)).patch(`/api/moderation/reports/${id}`)
      .send({ action: "dismiss", note: "Stale decision" })).status).toBe(409);
  });

  it("removes a reported post from the feed, withdraws owned media, and preserves the report", async () => {
    const mediaUrl = `/api/storage/objects/uploads/safety-${suffix}`;
    const postId = await makePost(mediaUrl);
    const id = await reportPost(postId);
    const result = await request(appFor(admin)).patch(`/api/moderation/reports/${id}`)
      .send({ action: "remove_content", note: "Violates community standards" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "resolved", postId, contentText: null, mediaUrl: null });
    expect(revoke).toHaveBeenCalledWith(mediaUrl, String(author.id));
    expect(result.body.reviewHistory[0].action).toBe("remove_content");
    const feed = await request(appFor(recipient)).get("/api/studio-posts");
    expect(feed.status).toBe(200);
    expect(feed.body.some((post: any) => post.id === postId)).toBe(false);
  });

  it("does not delete a post or close its report if media withdrawal fails", async () => {
    const postId = await makePost(`/api/storage/objects/uploads/failure-${suffix}`);
    const id = await reportPost(postId);
    revoke.mockRejectedValueOnce(new Error("Storage temporarily unavailable"));
    const result = await request(appFor(admin)).patch(`/api/moderation/reports/${id}`)
      .send({ action: "remove_content", note: "Remove harmful upload" });
    expect(result.status).toBe(500);
    expect((await pool.query("SELECT id FROM studio_posts WHERE id=$1", [postId])).rowCount).toBe(1);
    const state = await pool.query("SELECT status FROM content_reports WHERE id=$1", [id]);
    expect(state.rows[0].status).toBe("open");
    expect((await pool.query("SELECT id FROM content_report_reviews WHERE report_id=$1", [id])).rowCount).toBe(0);
  });

  it("removes only the reported private message, not the whole conversation", async () => {
    const second = await pool.query("INSERT INTO messages (conversation_id,sender_id,content) VALUES($1,$2,$3) RETURNING id",
      [conversationId, author.id, `Second private fixture ${suffix}`]);
    const report = await request(appFor(recipient)).post("/api/moderation/reports")
      .send({ messageId: second.rows[0].id, reason: "hate" });
    const result = await request(appFor(admin)).patch(`/api/moderation/reports/${report.body.id}`)
      .send({ action: "remove_content", note: "Remove only this message" });
    expect(result.status).toBe(200);
    expect((await pool.query("SELECT id FROM messages WHERE id=$1", [second.rows[0].id])).rowCount).toBe(0);
    expect((await pool.query("SELECT id FROM messages WHERE id=$1", [messageId])).rowCount).toBe(1);
    expect((await pool.query("SELECT id FROM conversations WHERE id=$1", [conversationId])).rowCount).toBe(1);
  });

  it("cannot delete an account through a creator report", async () => {
    const report = await request(appFor(recipient)).post("/api/moderation/reports")
      .send({ userId: author.id, reason: "other" });
    const result = await request(appFor(admin)).patch(`/api/moderation/reports/${report.body.id}`)
      .send({ action: "remove_content", note: "Invalid account removal" });
    expect(result.status).toBe(400);
    expect((await pool.query("SELECT id FROM users WHERE id=$1", [author.id])).rowCount).toBe(1);
  });
});

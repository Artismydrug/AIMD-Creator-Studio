import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import conversationsRouter from "./conversations";

const { notify } = vi.hoisted(() => ({ notify: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/notifications", () => ({ createNotification: notify }));

let sender: { id: number };
let recipient: { id: number };
let outsider: { id: number };
let conversationId: number;
const extraConversations = new Set<number>();
function appFor(user?: { id: number }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).dbUser = user; next(); });
  app.use("/api", conversationsRouter);
  app.use((_error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: "Test request failed" });
  });
  return app;
}
const send = (user: { id: number } | undefined, content: unknown, clientRequestId?: string) =>
  request(appFor(user)).post(`/api/conversations/${conversationId}/messages`).send({ content, clientRequestId });

beforeAll(async () => {
  const suffix = randomUUID();
  const users = await pool.query(
    "INSERT INTO users (username,email) VALUES ($1,$2),($3,$4),($5,$6) RETURNING id",
    ["sender", "recipient", "outsider"].flatMap(role =>
      [`social_${role}_${suffix}`, `social_${role}_${suffix}@example.test`]),
  );
  [sender, recipient, outsider] = users.rows;
  conversationId = (await pool.query("INSERT INTO conversations DEFAULT VALUES RETURNING id")).rows[0].id;
  await pool.query("INSERT INTO conversation_participants (conversation_id,user_id) VALUES ($1,$2),($1,$3)",
    [conversationId, sender.id, recipient.id]);
});
afterAll(async () => {
  for (const id of extraConversations) await pool.query("DELETE FROM conversations WHERE id=$1", [id]);
  if (conversationId) await pool.query("DELETE FROM conversations WHERE id=$1", [conversationId]);
  const ids = [sender?.id, recipient?.id, outsider?.id].filter(Boolean);
  if (ids.length) await pool.query("DELETE FROM users WHERE id=ANY($1::int[])", [ids]);
});

describe("durable message send de-duplication", () => {
  it("starts only one DM when both participants open it concurrently", async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      request(appFor(index % 2 ? outsider : sender)).post("/api/conversations")
        .send({ participantIds: [index % 2 ? sender.id : outsider.id] })));
    responses.forEach(response => { if (response.body.id) extraConversations.add(response.body.id); });
    expect(responses.every(response => [200, 201].includes(response.status))).toBe(true);
    expect(new Set(responses.map(response => response.body.id)).size).toBe(1);
    expect(responses.filter(response => !response.body.existing)).toHaveLength(1);
  });
  it("coalesces simultaneous sends and a later retry into one message and one notification", async () => {
    notify.mockClear();
    const id = randomUUID();
    const responses = await Promise.all(Array.from({ length: 6 }, () => send(sender, "A creative update", id)));
    expect(responses.every(response => response.status === 201)).toBe(true);
    expect(new Set(responses.map(response => response.body.id)).size).toBe(1);
    const replay = await send(sender, "A creative update", id);
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(responses[0].body.id);
    expect(notify).toHaveBeenCalledTimes(1);
    const rows = await pool.query("SELECT id FROM messages WHERE conversation_id=$1", [conversationId]);
    expect(rows.rows).toHaveLength(1);
  });

  it("rejects changed payloads using an existing identity but permits intentional new sends", async () => {
    const id = randomUUID();
    const first = await send(sender, "Practice complete", id);
    expect(first.status).toBe(201);
    expect((await send(sender, "Different private message", id)).status).toBe(409);
    const next = await send(sender, "Practice complete", randomUUID());
    expect(next.status).toBe(201);
    expect(next.body.id).not.toBe(first.body.id);
  });

  it("retains authentication, participant and bilateral block checks, even for a replay", async () => {
    const id = randomUUID();
    expect((await send(undefined, "Hello", id)).status).toBe(401);
    expect((await send(outsider, "Hello", id)).status).toBe(403);
    expect((await send(sender, { invalid: "not text" }, id)).status).toBe(400);
    expect((await send(sender, "Hello", "not-a-uuid")).status).toBe(400);
    expect((await send(sender, "Hello", id)).status).toBe(201);
    await pool.query("INSERT INTO user_blocks (blocker_id,blocked_id) VALUES ($1,$2)", [recipient.id, sender.id]);
    try {
      expect((await send(sender, "Hello", id)).status).toBe(403);
      expect((await send(sender, "New message", randomUUID())).status).toBe(403);
    } finally {
      await pool.query("DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2", [recipient.id, sender.id]);
    }
  });

  it("never recreates a removed message through a delayed retry", async () => {
    const id = randomUUID();
    const first = await send(sender, "Removed practice note", id);
    expect(first.status).toBe(201);
    await pool.query("DELETE FROM messages WHERE id=$1", [first.body.id]);
    expect((await send(sender, "Removed practice note", id)).status).toBe(410);
  });

  it("keeps older clients compatible without silently merging intentional identical messages", async () => {
    const first = await send(sender, "Legacy app message");
    const second = await send(sender, "Legacy app message");
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
  });
});

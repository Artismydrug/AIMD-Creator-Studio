import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import { ensureCreatorStudioSchema } from "../lib/ensureCreatorStudioSchema";
import notificationsRouter from "./notifications";
import usersRouter from "./users";

type TestUser = { id: number; email: string; username: string };
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
let actor: TestUser;
let recipient: TestUser;

function appFor(user?: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as any).dbUser = user;
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", notificationsRouter);
  app.use("/api", usersRouter);
  return app;
}

beforeAll(async () => {
  await ensureCreatorStudioSchema();
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username) VALUES ($1, $2), ($3, $4)
     RETURNING id, email, username`,
    [`notification_actor_${suffix}@example.test`, `notification_actor_${suffix}`,
      `notification_recipient_${suffix}@example.test`, `notification_recipient_${suffix}`],
  );
  [actor, recipient] = rows;
});

afterAll(async () => {
  const ids = [actor?.id, recipient?.id].filter(Boolean);
  if (ids.length) await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
});

describe("notifications", () => {
  it("requires authentication", async () => {
    await expect(request(appFor()).get("/api/notifications")).resolves.toMatchObject({ status: 401 });
    await expect(request(appFor()).post("/api/notifications/read-all")).resolves.toMatchObject({ status: 401 });
  });

  it("creates one follow alert and scopes read operations to its recipient", async () => {
    expect((await request(appFor(actor)).post(`/api/users/${recipient.id}/follow`)).status).toBe(200);
    expect((await request(appFor(actor)).post(`/api/users/${recipient.id}/follow`)).status).toBe(200);

    const listed = await request(appFor(recipient)).get("/api/notifications");
    expect(listed.status).toBe(200);
    expect(listed.body.unreadCount).toBe(1);
    expect(listed.body.notifications).toHaveLength(1);
    const notificationId = listed.body.notifications[0].id;

    expect((await request(appFor(actor)).patch(`/api/notifications/${notificationId}/read`)).status).toBe(404);
    expect((await request(appFor(recipient)).post("/api/notifications/read-all")).body.updatedCount).toBe(1);
    expect((await request(appFor(recipient)).get("/api/notifications")).body.unreadCount).toBe(0);
  });

  it("hides archived likes and critiques without counting them as unread or deleting their history", async () => {
    await pool.query(
      `INSERT INTO notifications (recipient_user_id, actor_user_id, type)
       VALUES ($1, $2, 'like'), ($1, $2, 'critique')`,
      [recipient.id, actor.id],
    );
    const listed = await request(appFor(recipient)).get("/api/notifications");
    expect(listed.status).toBe(200);
    expect(listed.body.notifications.every((notification: { type: string }) => !["like", "critique"].includes(notification.type))).toBe(true);
    expect(listed.body.notifications.some((notification: { type: string }) => notification.type === "follow")).toBe(true);
    expect(listed.body.unreadCount).toBe(0);
    const history = await pool.query(
      "SELECT count(*)::int AS count FROM notifications WHERE recipient_user_id = $1 AND type IN ('like', 'critique')",
      [recipient.id],
    );
    expect(history.rows[0].count).toBe(2);
  });
});
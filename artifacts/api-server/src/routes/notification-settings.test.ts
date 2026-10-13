import express from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import router from "./notification-settings";
import { deliverNotificationPush, sendExpoPushBatch, validExpoPushToken, type PushMessage } from "../lib/expoPush";

let first: number;
let second: number;
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const token = `ExpoPushToken[notification_test_${suffix}]`;
function appFor(id?: number) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (id) (req as any).dbUser = { id };
    next();
  });
  app.use("/api", router);
  return app;
}
beforeAll(async () => {
  const { rows } = await pool.query(
    "INSERT INTO users (email, username) VALUES ($1, $2), ($3, $4) RETURNING id",
    [`push_first_${suffix}@example.test`, `push_first_${suffix}`, `push_second_${suffix}@example.test`, `push_second_${suffix}`],
  );
  [first, second] = rows.map((row) => row.id);
});
afterAll(async () => {
  vi.unstubAllGlobals();
  if (first && second) await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [[first, second]]);
});

describe("notification settings", () => {
  it("requires authentication and defaults to opted out", async () => {
    expect((await request(appFor()).get("/api/notification-preferences")).status).toBe(401);
    expect((await request(appFor()).post("/api/notification-devices").send({ expoPushToken: token, platform: "ios" })).status).toBe(401);
    expect((await request(appFor(first)).get("/api/notification-preferences")).body).toEqual({ directMessages: false, newFollowers: false });
  });
  it("validates settings and preserves the other category during partial updates", async () => {
    for (const input of [{}, { directMessages: "true" }, { unexpected: true }]) {
      expect((await request(appFor(first)).patch("/api/notification-preferences").send(input)).status).toBe(400);
    }
    expect((await request(appFor(first)).patch("/api/notification-preferences").send({ directMessages: true })).body)
      .toEqual({ directMessages: true, newFollowers: false });
    expect((await request(appFor(first)).patch("/api/notification-preferences").send({ newFollowers: true })).body)
      .toEqual({ directMessages: true, newFollowers: true });
    expect((await request(appFor(second)).get("/api/notification-preferences")).body)
      .toEqual({ directMessages: false, newFollowers: false });
  });
  it("rejects invalid tokens, scopes removal, and moves a shared device to its current account", async () => {
    expect((await request(appFor(first)).post("/api/notification-devices").send({ expoPushToken: "not-an-expo-token-xxxxxxxxxx", platform: "ios" })).status).toBe(400);
    expect((await request(appFor(first)).post("/api/notification-devices").send({ expoPushToken: token, platform: "ios" })).status).toBe(200);
    await request(appFor(second)).delete("/api/notification-devices").send({ expoPushToken: token, platform: "ios" });
    expect((await pool.query("SELECT user_id FROM notification_push_devices WHERE expo_push_token = $1", [token])).rows[0].user_id).toBe(first);
    await request(appFor(second)).post("/api/notification-devices").send({ expoPushToken: token, platform: "ios" });
    expect((await pool.query("SELECT user_id FROM notification_push_devices WHERE expo_push_token = $1", [token])).rows[0].user_id).toBe(second);
  });
  it("only dispatches enabled categories and removes rejected device tokens", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", transport);
    try {
      await deliverNotificationPush(second, "direct_message", 123);
      expect(transport).not.toHaveBeenCalled();
      await request(appFor(second)).patch("/api/notification-preferences").send({ directMessages: true });
      await deliverNotificationPush(second, "like");
      expect(transport).not.toHaveBeenCalled();
      await deliverNotificationPush(second, "direct_message", 123);
      expect(transport).toHaveBeenCalledOnce();
      const sent = JSON.parse(String(transport.mock.calls[0][1]?.body));
      expect(sent[0].data).toEqual({ type: "direct_message", recipientUserId: second, conversationId: 123 });
      expect(sent[0].body).toBe("Open Creator Studio to see your notification.");
      expect((await pool.query("SELECT id FROM notification_push_devices WHERE expo_push_token = $1", [token])).rows).toHaveLength(0);
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("Expo push transport", () => {
  it("validates push token formats", () => {
    expect(validExpoPushToken(token)).toBe(true);
    expect(validExpoPushToken("https://malicious.example/token")).toBe(false);
  });
  it("fails explicitly on a provider error or malformed ticket", async () => {
    const message: PushMessage = { to: token, title: "Test", body: "Test", data: { type: "follow" }, sound: "default", channelId: "creator-studio-updates" };
    await expect(sendExpoPushBatch([message], vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 })))).rejects.toThrow("HTTP 503");
    await expect(sendExpoPushBatch([message], vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 })))).rejects.toThrow("invalid ticket");
  });
});

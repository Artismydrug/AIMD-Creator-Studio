import express from "express";
import request from "supertest";
import { expect, it } from "vitest";
import { heavyAdmissionGuard, trackHeavyWork } from "./serverReliability";

it("keeps a heavy-work slot until processing finishes even after a client disconnects", async () => {
  let begin!: () => void;
  let disconnect!: () => void;
  let finish!: () => void;
  const started = new Promise<void>((resolve) => { begin = resolve; });
  const closed = new Promise<void>((resolve) => { disconnect = resolve; });
  const held = new Promise<void>((resolve) => { finish = resolve; });
  const app = express();
  app.use("/api", heavyAdmissionGuard(1, (req) => req.path === "/upload"));
  app.post("/api/upload", trackHeavyWork(async (_req, res) => {
    res.once("close", disconnect);
    begin();
    await held;
    if (!res.destroyed) res.json({ ok: true });
  }));
  app.get("/api/normal", (_req, res) => { res.json({ ok: true }); });
  const upload = request(app).post("/api/upload");
  const attempt = upload.then(() => undefined, () => undefined);
  try {
    await started;
    upload.abort();
    await closed;
    expect((await request(app).post("/api/upload")).status).toBe(503);
    expect((await request(app).get("/api/normal")).status).toBe(200);
  } finally { finish(); await attempt; }
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect((await request(app).post("/api/upload")).status).toBe(200);
});

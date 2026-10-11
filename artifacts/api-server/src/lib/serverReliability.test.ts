import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiAdmissionGuard, apiErrorHandler, isTransientDatabaseError, setServerDraining } from "./serverReliability";
import { createReadinessProbe } from "./readiness";

afterEach(() => { setServerDraining(false); vi.useRealTimers(); });

function testApp(max = 100) {
  const app = express();
  app.use((req, _res, next) => { (req as any).log = { error: vi.fn() }; next(); });
  app.use("/api", apiAdmissionGuard(max));
  app.use(express.json());
  app.get("/api/ok", (_req, res) => res.json({ ok: true }));
  app.get("/api/livez", (_req, res) => res.json({ status: "ok" }));
  return app;
}

describe("API admission and failure handling", () => {
  it("rejects excess work and releases each completed request only once", async () => {
    const app = testApp(2);
    const held: Array<() => void> = [];
    app.get("/api/hold", (_req, res) => { held.push(() => res.json({ ok: true })); });
    app.use(apiErrorHandler);
    const first = request(app).get("/api/hold").then((res) => res);
    const second = request(app).get("/api/hold").then((res) => res);
    try {
      for (let i = 0; held.length < 2 && i < 100; i++) await new Promise((r) => setTimeout(r, 5));
      expect(held).toHaveLength(2);
      const busy = await request(app).get("/api/ok");
      expect(busy.status).toBe(503);
      expect(busy.headers["retry-after"]).toBe("1");
    } finally { held.forEach((finish) => finish()); }
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect((await request(app).get("/api/ok")).status).toBe(200);
  });

  it("keeps liveness available while draining but refuses new application work", async () => {
    const app = testApp();
    setServerDraining();
    expect((await request(app).get("/api/ok")).status).toBe(503);
    expect((await request(app).get("/api/livez")).status).toBe(200);
  });

  it("caps heavy uploads independently without blocking normal reads", async () => {
    const app = testApp();
    app.use("/api", apiAdmissionGuard(1, (req) => req.path === "/upload"));
    let release!: () => void;
    app.post("/api/upload", (_req, res) => { release = () => res.json({ ok: true }); });
    const active = request(app).post("/api/upload").then((result) => result);
    try {
      for (let i = 0; !release && i < 100; i++) await new Promise((r) => setTimeout(r, 5));
      expect(release).toBeTypeOf("function");
      expect((await request(app).post("/api/upload")).status).toBe(503);
      expect((await request(app).get("/api/ok")).status).toBe(200);
    } finally { release?.(); }
    expect((await active).status).toBe(200);
  });
  it("returns retryable JSON for simultaneous database failures without leaking SQL parameters", async () => {
    const app = testApp();
    app.get("/api/failure", async () => {
      throw Object.assign(new Error("SQL parameters: private-canary"), { cause: { code: "53300" } });
    });
    app.use(apiErrorHandler);
    const results = await Promise.all(Array.from({ length: 20 }, () => request(app).get("/api/failure")));
    for (const result of results) {
      expect(result.status).toBe(503);
      expect(result.headers["retry-after"]).toBe("1");
      expect(JSON.stringify(result.body)).not.toContain("private-canary");
    }
    expect((await request(app).get("/api/ok")).status).toBe(200);
  });

  it("handles malformed/oversized JSON and unexpected failures consistently", async () => {
    const app = testApp();
    app.post("/api/ok", (_req, res) => res.json({ ok: true }));
    app.get("/api/bug", () => { throw new Error("private-canary"); });
    app.use(apiErrorHandler);
    expect((await request(app).post("/api/ok").set("Content-Type", "application/json").send("{")).status).toBe(400);
    expect((await request(app).post("/api/ok").send({ value: "x".repeat(200_000) })).status).toBe(413);
    const failure = await request(app).get("/api/bug");
    expect(failure.status).toBe(500);
    expect(JSON.stringify(failure.body)).not.toContain("private-canary");
  });

  it("recognizes driver timeouts, wrapped SQL cancellation and dropped connections", () => {
    for (const error of [
      new Error("timeout exceeded when trying to connect"),
      new Error("Query read timeout"),
      { cause: { code: "57014" } }, { code: "57P01" }, { code: "08006" },
    ]) expect(isTransientDatabaseError(error)).toBe(true);
    expect(isTransientDatabaseError({ code: "23505" })).toBe(false);
  });
});

describe("bounded database readiness", () => {
  it("shares one probe between 50 simultaneous checks and caches success", async () => {
    const query = vi.fn(async () => undefined);
    const ready = createReadinessProbe(query);
    expect((await Promise.all(Array.from({ length: 50 }, ready))).every(Boolean)).toBe(true);
    expect(await ready()).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("caches failures briefly, then recovers when the database returns", async () => {
    vi.useFakeTimers();
    const query = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const ready = createReadinessProbe(query);
    expect(await ready()).toBe(false);
    expect(await ready()).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_001);
    expect(await ready()).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("times out callers without spawning more queries while the original is stuck", async () => {
    vi.useFakeTimers();
    const query = vi.fn(() => new Promise(() => undefined));
    const ready = createReadinessProbe(query);
    const first = ready();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await first).toBe(false);
    await vi.advanceTimersByTimeAsync(1_001);
    const second = ready();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await second).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

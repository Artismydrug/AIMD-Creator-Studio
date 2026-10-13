import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import router from "./monthly-drops";

function app(user?: { id: number; isAdmin?: boolean }) {
  const instance = express();
  instance.use(express.json());
  instance.use((req, _res, next) => { Object.assign(req, { dbUser: user }); next(); });
  instance.use("/api", router);
  return instance;
}
afterEach(() => vi.restoreAllMocks());
describe("monthly drop route boundaries", () => {
  it("requires an account to request a package", async () => {
    const connect = vi.spyOn(pool, "connect");
    expect((await request(app()).post("/api/rewards/monthly-drops/1/request")).status).toBe(401);
    expect(connect).not.toHaveBeenCalled();
  });
  it.each(["userId", "tier", "points", "status"])("never accepts forged %s on a member request", async key => {
    const connect = vi.spyOn(pool, "connect");
    const response = await request(app({ id: 7 })).post("/api/rewards/monthly-drops/1/request").send({ [key]: 999 });
    expect(response.status).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });
  it.each(["monthly-drops", "monthly-drop-requests?dropId=1"])("keeps admin %s reads private", async path => {
    expect((await request(app()).get(`/api/admin/${path}`)).status).toBe(401);
    expect((await request(app({ id: 7 })).get(`/api/admin/${path}`)).status).toBe(403);
  });
  it("blocks catalog creation and request approval for non-admin members", async () => {
    expect((await request(app({ id: 7 })).post("/api/admin/monthly-drops").send({})).status).toBe(403);
    expect((await request(app({ id: 7 })).patch("/api/admin/monthly-drop-requests/1").send({ status: "approved" })).status).toBe(403);
  });
  it.each([
    { monthKey: "2026-13" }, { stock: -1 }, { stock: 1.5 },
    { title: "   " }, { items: ["  "] }, { userId: 9 },
  ])("rejects invalid catalog input %j", async patch => {
    const connect = vi.spyOn(pool, "connect");
    const response = await request(app({ id: 7, isAdmin: true })).post("/api/admin/monthly-drops")
      .send({ monthKey: "2026-10", title: "Member package", items: ["Art print"], stock: 2, ...patch });
    expect(response.status).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });
  it("rejects invalid pagination without querying member data", async () => {
    const query = vi.spyOn(pool, "query");
    expect((await request(app({ id: 7, isAdmin: true })).get("/api/admin/monthly-drop-requests?dropId=1&limit=10000")).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});

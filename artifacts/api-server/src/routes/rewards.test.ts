import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { pool } from "@workspace/db";
import router from "./rewards";

function appFor(userId?: number) {
  const app = express();
  app.use((req, _res, next) => {
    if (userId) Object.assign(req, { dbUser: { id: userId } });
    next();
  });
  app.use("/api", router);
  return app;
}
afterEach(() => vi.restoreAllMocks());

describe("lifetime points and independent member drops", () => {
  it("retires fixed point offers without changing the award ledger", () => {
    const source = readFileSync(new URL("../lib/rewards.ts", import.meta.url), "utf8");
    expect(source).not.toContain("REWARD_TIERS");
    expect(source).toContain("points = points + $2");
  });

  it.each([0, 499, 500, 999, 1000, 1999, 2000, 2001, 1000000])("keeps %i points intact without threshold offers", async (points) => {
    const query = vi.spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [{ points }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);
    const response = await request(appFor(7)).get("/api/rewards");
    expect(response.status).toBe(200);
    expect(response.body.points).toBe(points);
    expect(response.body.tiers).toEqual([]);
    expect(response.body.monthlyDrop).toBeNull();
    expect(response.body.recentRequests).toEqual([]);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0][0]).toMatch(/^SELECT points FROM users/);
    expect(query.mock.calls[0][1]).toEqual([7]);
    expect(query.mock.calls[2][1]).toEqual([7]);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary).toContain("Authorization");
    expect(response.headers.vary).toContain("Cookie");
  });

  it("never substitutes another creator's points for an anonymous visitor", async () => {
    const query = vi.spyOn(pool, "query");
    const response = await request(appFor()).get("/api/rewards");
    expect(response.status).toBe(200);
    expect(response.body.points).toBe(0);
    expect(response.body.tiers).toEqual([]);
    expect(response.body.monthlyDrop).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("shows account-only monthly requests without checkout", () => {
    const card = readFileSync(new URL("../../../aimd-network/components/MonthlyMemberDrops.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../../../aimd-network/app/(tabs)/index.tsx", import.meta.url), "utf8");
    const web = readFileSync(new URL("../../../aimd-academy/src/pages/StudioLog.tsx", import.meta.url), "utf8");
    expect(card).not.toContain("data.tiers");
    expect(card).toContain("data.points.toLocaleString()");
    expect(card).toContain("Redeem for merch, events &amp; drops.");
    expect(card).not.toContain("Free, $39 and $99 members have equal access");
    expect(card).not.toContain("Members can use their AIMD points towards");
    expect(card).toContain("onPress={() => router.push('/rewards')}");
    expect(card).toContain('testID="open-monthly-member-drops"');
    expect(card).toContain("submitting.current");
    expect(card).toContain("setConfirmation(null)");
    expect(card).not.toContain("checkout");
    expect(home).toContain("<MonthlyMemberDrops compact");
    // Actual earning callbacks and pull-to-refresh are exercised by
    // native-dashboard-data-smoke; counting source occurrences missed which action refreshed.
    expect(web).toContain("<MonthlyMemberDrops");
    expect(web).not.toContain("Rewards are claimed in person");
  });
});

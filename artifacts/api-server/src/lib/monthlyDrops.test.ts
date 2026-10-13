import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { createDrop, currentDropMonth, loadDrop, memberRewards, requestDrop, updateDrop, updateDropRequest } from "./monthlyDrops";

const ids: number[] = [];
const dropIds: number[] = [];
let admin: number;
let dropId: number;

beforeAll(async () => {
  // Only Date is faked: real database/network timeouts continue working.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2886-10-15T18:00:00Z"));
  const prefix = `dropqa_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  for (let i = 0; i < 7; i++) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO users (username,email,is_admin,points,tier) VALUES ($1,$2,$3,777,$4) RETURNING id`,
      [`${prefix}_${i}`, `${prefix}_${i}@example.com`, i === 0, ["free", "academy", "pro"][i % 3]]);
    ids.push(rows[0].id);
  }
  admin = ids[0];
  const drop = await createDrop({ monthKey: currentDropMonth(), title: "QA disposable package", items: ["QA print"], stock: 2, status: "open" }, admin);
  dropId = drop.id; dropIds.push(dropId);
}, 20000);

beforeEach(async () => {
  await pool.query("DELETE FROM monthly_member_drop_requests WHERE drop_id = ANY($1::int[])", [dropIds]);
  await pool.query("UPDATE monthly_member_drops SET stock=2,status='open' WHERE id=$1", [dropId]);
});
afterAll(async () => {
  try {
    if (dropIds.length) {
      await pool.query("DELETE FROM monthly_member_drop_requests WHERE drop_id = ANY($1::int[])", [dropIds]);
      await pool.query("DELETE FROM monthly_member_drops WHERE id = ANY($1::int[])", [dropIds]);
    }
    if (ids.length) await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
  } finally { vi.useRealTimers(); }
});

describe("stock-limited monthly packages with no points or paid-tier gate", () => {
  it("uses Los Angeles month boundaries", () => {
    expect(currentDropMonth(new Date("2026-11-01T06:59:59Z"))).toBe("2026-10");
    expect(currentDropMonth(new Date("2026-11-01T07:00:00Z"))).toBe("2026-11");
  });
  it("allows free and paid accounts without spending any points", async () => {
    await updateDrop(dropId, { stock: 6 }, admin);
    for (const userId of ids.slice(1, 4)) {
      const created = await requestDrop(dropId, userId);
      expect(created.created).toBe(true);
      expect(created.request.userId).toBe(userId);
      expect(created.request.status).toBe("pending");
      const info = await memberRewards(userId);
      expect(info.points).toBe(777);
      expect(info.tiers).toEqual([]);
      expect(info.monthlyDrop?.ownRequest?.id).toBe(created.request.id);
      expect(info.recentRequests).toHaveLength(1);
    }
    expect((await memberRewards(ids[4])).recentRequests).toEqual([]);
  });
  it("serializes simultaneous requests so two packages never become three", async () => {
    const results = await Promise.allSettled(ids.slice(1).map(userId => requestDrop(dropId, userId)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(2);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(4);
    for (const result of results) if (result.status === "rejected") expect(result.reason).toMatchObject({ status: 409 });
    expect(await loadDrop(dropId)).toMatchObject({ remaining: 0, reserved: 2, requestCount: 2 });
  });
  it("returns the same request on simultaneous/repeated taps, even after closure", async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => requestDrop(dropId, ids[1])));
    expect(new Set(responses.map(r => r.request.id)).size).toBe(1);
    expect(responses.filter(r => r.created)).toHaveLength(1);
    expect((await loadDrop(dropId)).reserved).toBe(1);
    await updateDrop(dropId, { status: "closed" }, admin);
    expect((await requestDrop(dropId, ids[1])).created).toBe(false);
    await expect(requestDrop(dropId, ids[2])).rejects.toMatchObject({ status: 409 });
  });
  it("keeps requested contents fixed and prevents reducing allocated stock", async () => {
    await requestDrop(dropId, ids[1]);
    await expect(updateDrop(dropId, { stock: 0 }, admin)).rejects.toMatchObject({ status: 409 });
    await expect(updateDrop(dropId, { items: ["Different gift"] }, admin)).rejects.toMatchObject({ status: 409 });
    await expect(updateDrop(dropId, { status: "draft" }, admin)).rejects.toMatchObject({ status: 409 });
    expect((await updateDrop(dropId, { stock: 3 }, admin)).remaining).toBe(2);
  });
  it("releases declined reservations, guards reapproval, and requires approval before fulfillment", async () => {
    const first = (await requestDrop(dropId, ids[1])).request;
    await expect(updateDropRequest(first.id, "fulfilled", admin)).rejects.toMatchObject({ status: 409 });
    await updateDropRequest(first.id, "declined", admin);
    expect((await loadDrop(dropId)).remaining).toBe(2);
    await requestDrop(dropId, ids[2]); await requestDrop(dropId, ids[3]);
    await expect(updateDropRequest(first.id, "approved", admin)).rejects.toMatchObject({ status: 409 });
  });
  it("retains consumed stock after a fulfilled member deletes their account", async () => {
    const row = (await requestDrop(dropId, ids[5])).request;
    await updateDropRequest(row.id, "approved", admin);
    await updateDropRequest(row.id, "fulfilled", admin);
    await expect(updateDropRequest(row.id, "declined", admin)).rejects.toMatchObject({ status: 409 });
    await pool.query("DELETE FROM users WHERE id=$1", [ids[5]]);
    expect(await loadDrop(dropId)).toMatchObject({ reserved: 1, remaining: 1 });
    const stored = await pool.query("SELECT user_id FROM monthly_member_drop_requests WHERE id=$1", [row.id]);
    expect(stored.rows[0].user_id).toBeNull();
  });
  it("releases a deleted member's pending reservation and refuses approval", async () => {
    const row = (await requestDrop(dropId, ids[6])).request;
    await pool.query("DELETE FROM users WHERE id=$1", [ids[6]]);
    expect((await loadDrop(dropId)).remaining).toBe(2);
    await expect(updateDropRequest(row.id, "approved", admin)).rejects.toMatchObject({ status: 409 });
  });
  it("rejects future-month requests and duplicate catalog entries", async () => {
    const future = await createDrop({ monthKey: "2886-11", title: "Future QA drop", items: ["QA item"], stock: 1, status: "open" }, admin);
    dropIds.push(future.id);
    await expect(requestDrop(future.id, ids[1])).rejects.toMatchObject({ status: 409 });
    await expect(createDrop({ monthKey: currentDropMonth(), title: "Duplicate QA drop", items: ["QA item"], stock: 1 }, admin)).rejects.toMatchObject({ status: 409 });
  });
});

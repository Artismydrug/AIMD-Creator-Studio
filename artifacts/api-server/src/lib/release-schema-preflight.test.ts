import { readFileSync } from "node:fs";
import { pool } from "@workspace/db";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../../../docs/releases/creator-studio-schema-preflight.sql", import.meta.url), "utf8");
type Check = { item: string; status: "ready" | "pending" | "conflict"; expectation: string };

async function preflight(query = sql, schema = "public"): Promise<Check[]> {
  const client = await pool.connect();
  try {
    // Even an accidental write in a later edit of the staged SQL cannot run here.
    await client.query("BEGIN READ ONLY");
    return (await client.query<Check>(query, [schema])).rows;
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

describe("staged Creator Studio schema preflight (read-only)", () => {
  it("matches development columns, defaults, keys and indexes required by current features", async () => {
    const checks = await preflight();
    expect(checks).toHaveLength(22);
    expect(checks.filter(check => check.status !== "ready")).toEqual([]);
  });

  it("reports absent objects as pending without creating them", async () => {
    const checks = await preflight(sql, "creator_release_preflight_nonexistent_namespace");
    expect(checks).toHaveLength(22);
    expect(checks.every(check => check.status === "pending")).toBe(true);
  });

  it("rejects incompatible existing column definitions instead of treating existence as success", async () => {
    const alteredExpectation = sql.replace(
      "('studio_posts', 'portfolio_category_id', 'integer', false, NULL)",
      "('studio_posts', 'portfolio_category_id', 'uuid', false, NULL)",
    );
    expect(alteredExpectation).not.toBe(sql);
    const checks = await preflight(alteredExpectation);
    expect(checks.find(check => check.item === "column:studio_posts.portfolio_category_id")?.status).toBe("conflict");
  });

  it("checks category removal preserves artwork rather than cascading deletion", async () => {
    const alteredExpectation = sql.replace(
      "('studio_posts', 'portfolio_category_id', 'creator_portfolio_categories', 'id', 'n')",
      "('studio_posts', 'portfolio_category_id', 'creator_portfolio_categories', 'id', 'c')",
    );
    expect(alteredExpectation).not.toBe(sql);
    const checks = await preflight(alteredExpectation);
    expect(checks.find(check => check.item === "foreign-key:studio_posts.portfolio_category_id")?.status).toBe("conflict");
  });
});

import { pool } from "@workspace/db";

type SqlExecutor = {
  query(queryText: string): Promise<unknown>;
};

/**
 * Preserve Tier 2 access while the product-facing tier name moves from
 * "workshop" to "academy". This is intentionally idempotent.
 */
export async function ensureUserTierCompatibility(
  database: SqlExecutor = pool,
): Promise<void> {
  await database.query(`
    UPDATE users
    SET tier = 'academy'
    WHERE tier = 'workshop'
  `);
}
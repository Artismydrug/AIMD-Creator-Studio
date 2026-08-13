/**
 * Ensures auth schema exists on every server startup.
 *
 * - sessions table: required by the session-based auth middleware.
 * - users.replit_id column: links Replit OIDC sub claims to integer DB user rows.
 *
 * Both operations are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) —
 * safe to run repeatedly across restarts and deployments.
 */

import { pool } from "@workspace/db";

export async function ensureAuthSchema(): Promise<void> {
  // Create sessions table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid    VARCHAR PRIMARY KEY,
      sess   JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire)
  `);

  // Add replit_id column to users if it doesn't exist
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS replit_id TEXT UNIQUE
  `);
}

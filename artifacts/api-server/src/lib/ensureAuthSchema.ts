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

  // Add clerk_id column to users if it doesn't exist
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE
  `);

  // Add first_name and last_name columns synced from Clerk identity
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT
  `);

  // Keep deleted Clerk identities from being JIT-provisioned again by an
  // unexpired mobile session token.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_clerk_users (
      clerk_id TEXT PRIMARY KEY,
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Add a unique index on users.username if it doesn't already exist.
  // Wrapped in a try/catch: if duplicate usernames already exist in the DB,
  // the index creation will fail — the app logs a warning and continues; the
  // webhook's pre-check SELECT will handle conflicts safely at runtime.
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
      ON users (username)
    `);
  } catch (err: any) {
    console.warn(
      "[ensureAuthSchema] Could not create unique index on users.username " +
      "(duplicate values may already exist). Webhook username sync will " +
      "fall back to a SELECT-then-update approach.\n" + err?.message,
    );
  }
}

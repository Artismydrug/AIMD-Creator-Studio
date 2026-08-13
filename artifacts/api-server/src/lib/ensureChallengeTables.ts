/**
 * Ensures challenge-related tables and columns exist on every server startup.
 *
 * All operations are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
 * — safe to run repeatedly across restarts and deployments.
 *
 *  badges.event_code         — links a badge to the QR event code that earned it;
 *                               unique per (user_id, event_code) to block duplicate claims.
 *  challenge_submissions     — one row per creator per challenge week.
 *  challenge_votes           — one row per voter per submission; unique constraint
 *                               prevents double-voting.
 */

import { pool } from "@workspace/db";

export async function ensureChallengeTables(): Promise<void> {
  // Add event_code column to badges if it doesn't already exist
  await pool.query(`
    ALTER TABLE badges ADD COLUMN IF NOT EXISTS event_code TEXT
  `);

  // Unique constraint on (user_id, event_code) so the same creator can't
  // claim the same event badge twice.  We skip the constraint if it already exists.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_badge_user_event_code'
      ) THEN
        ALTER TABLE badges
          ADD CONSTRAINT uq_badge_user_event_code UNIQUE (user_id, event_code);
      END IF;
    END
    $$;
  `);

  // challenge_submissions — one entry per creator per challenge week
  await pool.query(`
    CREATE TABLE IF NOT EXISTS challenge_submissions (
      id              SERIAL PRIMARY KEY,
      challenge_week  TEXT NOT NULL,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caption         TEXT NOT NULL,
      image_url       TEXT,
      tags            TEXT[] NOT NULL DEFAULT '{}',
      vote_count      INTEGER NOT NULL DEFAULT 0,
      created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_challenge_submission_user_week UNIQUE (challenge_week, user_id)
    );
  `);

  // challenge_votes — one vote per user per submission
  await pool.query(`
    CREATE TABLE IF NOT EXISTS challenge_votes (
      id              SERIAL PRIMARY KEY,
      submission_id   INTEGER NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_challenge_vote_user_submission UNIQUE (submission_id, user_id)
    );
  `);
}

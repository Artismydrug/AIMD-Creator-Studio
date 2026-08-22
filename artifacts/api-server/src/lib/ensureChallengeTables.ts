/**
 * Ensures challenge-related tables and columns exist on every server startup.
 *
 * All operations are idempotent so existing installations can be upgraded from
 * the original image-only challenge schema before any route handles a request.
 */

import { pool } from "@workspace/db";

type SqlExecutor = {
  query(queryText: string): Promise<unknown>;
};

export async function ensureChallengeTables(
  database: SqlExecutor = pool,
): Promise<void> {
  // Add event_code column to badges if it doesn't already exist
  await database.query(`
    ALTER TABLE badges ADD COLUMN IF NOT EXISTS event_code TEXT
  `);

  // Unique constraint on (user_id, event_code) so the same creator can't
  // claim the same event badge twice.  We skip the constraint if it already exists.
  await database.query(`
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

  await database.query(`
    CREATE TABLE IF NOT EXISTS challenge_media_uploads (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      object_path       TEXT NOT NULL,
      purpose           TEXT NOT NULL,
      media_type        TEXT NOT NULL,
      content_type      TEXT NOT NULL,
      sha256             TEXT NOT NULL,
      capture_source    TEXT NOT NULL,
      captured_at       TIMESTAMP WITH TIME ZONE,
      exif_timestamp    TIMESTAMP WITH TIME ZONE,
      capture_metadata  JSONB NOT NULL DEFAULT '{}'::jsonb,
      uploaded_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      consumed_at       TIMESTAMP WITH TIME ZONE
    );
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS challenge_media_uploads_object_path_unique
      ON challenge_media_uploads (object_path);
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS challenge_submissions (
      id                        SERIAL PRIMARY KEY,
      challenge_week            TEXT NOT NULL,
      user_id                   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caption                   TEXT NOT NULL,
      image_url                 TEXT,
      final_media_upload_id     INTEGER REFERENCES challenge_media_uploads(id) ON DELETE RESTRICT,
      process_media_upload_id   INTEGER REFERENCES challenge_media_uploads(id) ON DELETE SET NULL,
      verification_status       TEXT NOT NULL DEFAULT 'pending_review',
      verification_reviewed_at  TIMESTAMP WITH TIME ZONE,
      verification_reviewer_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      tags                      TEXT[] NOT NULL DEFAULT '{}',
      vote_count                INTEGER NOT NULL DEFAULT 0,
      created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Upgrade the original image-only table without dropping legacy submissions.
  await database.query(`
    ALTER TABLE challenge_submissions
      ADD COLUMN IF NOT EXISTS final_media_upload_id
        INTEGER REFERENCES challenge_media_uploads(id) ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS process_media_upload_id
        INTEGER REFERENCES challenge_media_uploads(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verification_status
        TEXT NOT NULL DEFAULT 'pending_review',
      ADD COLUMN IF NOT EXISTS verification_reviewed_at
        TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS verification_reviewer_id
        INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_submission_user_week
      ON challenge_submissions (challenge_week, user_id);
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS challenge_votes (
      id              SERIAL PRIMARY KEY,
      submission_id   INTEGER NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_vote_user_submission
      ON challenge_votes (submission_id, user_id);
  `);
}

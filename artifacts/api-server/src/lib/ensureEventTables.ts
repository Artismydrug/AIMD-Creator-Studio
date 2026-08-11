/**
 * Ensures event_attendances table exists on every server startup.
 *
 * Using CREATE TABLE IF NOT EXISTS keeps this idempotent — safe to run
 * repeatedly across restarts and deployments.  The table is separate from
 * event_rsvps: an RSVP records intent; attendance records physical check-in
 * via QR scan.  The unique constraint on (user_id, event_id) makes duplicate
 * scans idempotent at the database level.
 */

import { pool } from "@workspace/db";

export async function ensureEventTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_attendances (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      event_id     INTEGER NOT NULL REFERENCES community_events(id),
      checked_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_event_attendance_user_event UNIQUE (user_id, event_id)
    );
  `);
}

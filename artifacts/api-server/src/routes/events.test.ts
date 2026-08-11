/**
 * Endpoint integration tests for Event QR check-in.
 *
 * These tests run against the real Express app (no network server started) via
 * supertest.  The DATABASE_URL environment variable must be set and the
 * event_attendances table must exist (ensured by ensureEventTables on startup).
 *
 * SESSION_SECRET must be set — tests derive the organizer key from it, just as
 * the server does, to verify the authorization contract end-to-end.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { pool } from "@workspace/db";
import { deriveOrganizerKey, generateToken, signToken } from "../lib/eventQrToken";

// The tests need a real SESSION_SECRET (server fails-closed without one).
// In CI / the Replit environment this is always set.
const SESSION_SECRET = process.env.SESSION_SECRET;

// Derive the organizer key the same way the server does — this verifies the
// full authorization contract, not just a mock check.
const ORGANIZER_KEY = SESSION_SECRET ? deriveOrganizerKey(SESSION_SECRET) : "";

let testEventId: number | null = null;

beforeAll(async () => {
  if (!SESSION_SECRET) {
    console.warn("SESSION_SECRET not set — integration tests will be skipped");
    return;
  }

  // Ensure the attendance table exists (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_attendances (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      event_id      INTEGER NOT NULL REFERENCES community_events(id),
      checked_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_event_attendance_user_event UNIQUE (user_id, event_id)
    );
  `).catch(() => {}); // may already exist

  // Find an event to test against (use the first available one)
  const { rows } = await pool.query<{ id: number }>(
    "SELECT id FROM community_events ORDER BY id LIMIT 1"
  );
  testEventId = rows[0]?.id ?? null;

  if (testEventId !== null) {
    // Clean up any pre-existing attendance for user 1 on this event
    await pool.query(
      "DELETE FROM event_attendances WHERE user_id = 1 AND event_id = $1",
      [testEventId]
    );
  }
});

afterAll(async () => {
  if (testEventId !== null && SESSION_SECRET) {
    // Clean up test attendance records so tests are idempotent
    await pool.query(
      "DELETE FROM event_attendances WHERE user_id = 1 AND event_id = $1",
      [testEventId]
    );
  }
  await pool.end().catch(() => {});
});

// ── QR Token issuance authorization ──────────────────────────────────────────

describe("GET /api/events/:id/qr-token", () => {
  it("returns 403 when X-Organizer-Key header is missing", async () => {
    if (!SESSION_SECRET) return;
    const res = await request(app).get("/api/events/1/qr-token");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/organizer/i);
  });

  it("returns 403 when X-Organizer-Key is wrong", async () => {
    if (!SESSION_SECRET) return;
    const res = await request(app)
      .get("/api/events/1/qr-token")
      .set("X-Organizer-Key", "definitely-wrong-key");
    expect(res.status).toBe(403);
  });

  it("returns a signed token when authorized", async () => {
    if (!SESSION_SECRET || testEventId === null) return;
    const res = await request(app)
      .get(`/api/events/${testEventId}/qr-token`)
      .set("X-Organizer-Key", ORGANIZER_KEY);
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^\d+\.\d+\.[A-Za-z0-9_-]+$/); // eventId.expiry.sig
    expect(res.body.eventId).toBe(testEventId);
    expect(res.body.eventTitle).toBeTruthy();
    expect(res.body.expiresAt).toBeTruthy();
  });
});

// ── Check-in idempotency ──────────────────────────────────────────────────────

describe("POST /api/events/check-in", () => {
  it("rejects a plain integer (no signature)", async () => {
    if (!SESSION_SECRET) return;
    const res = await request(app)
      .post("/api/events/check-in")
      .send({ qrData: "42" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not a valid/i);
  });

  it("rejects a token with a tampered signature", async () => {
    if (!SESSION_SECRET) return;
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const tampered = `1.${expiry}.${"A".repeat(43)}`;
    const res = await request(app)
      .post("/api/events/check-in")
      .send({ qrData: tampered });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/signature/i);
  });

  it("rejects an expired token", async () => {
    if (!SESSION_SECRET) return;
    const pastExpiry = Math.floor(Date.now() / 1000) - 10;
    const sig = signToken(1, pastExpiry, SESSION_SECRET);
    const expired = `1.${pastExpiry}.${sig}`;
    const res = await request(app)
      .post("/api/events/check-in")
      .send({ qrData: expired });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("first scan succeeds and records attendance", async () => {
    if (!SESSION_SECRET || testEventId === null) return;
    const token = generateToken(testEventId);
    const res = await request(app)
      .post("/api/events/check-in")
      .send({ qrData: token });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alreadyCheckedIn).toBe(false);
    expect(res.body.eventId).toBe(testEventId);
  });

  it("duplicate scan is idempotent — returns alreadyCheckedIn: true, not an error", async () => {
    if (!SESSION_SECRET || testEventId === null) return;
    // Same event — attendance was already recorded in the previous test
    const token = generateToken(testEventId);
    const res = await request(app)
      .post("/api/events/check-in")
      .send({ qrData: token });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alreadyCheckedIn).toBe(true);
    expect(res.body.message).toMatch(/already/i);
  });
});

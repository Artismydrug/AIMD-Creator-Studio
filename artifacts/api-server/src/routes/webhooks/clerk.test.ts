/**
 * Integration tests for the Clerk webhook endpoint.
 *
 * Runs against the real Express app via supertest and hits the real database.
 * Each test inserts its own rows and cleans up after itself — idempotent and
 * safe to run in any order.
 *
 * Signature verification uses a local test signing secret; no real Clerk
 * credentials are required.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import type { Response } from "supertest";
import { Webhook } from "svix";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import app from "../../app";

// ── Test webhook secret ───────────────────────────────────────────────────────

// A 32-byte base64-encoded secret — Svix requires at least 24 bytes.
const TEST_WEBHOOK_SECRET = "whsec_dGVzdHNlY3JldGZvcndlYmhvb2t0ZXN0aW5n";

// ── Helper: build a properly signed Svix request ─────────────────────────────

async function buildSignedRequest(payload: object): Promise<Response> {
  const body = JSON.stringify(payload);
  const wh = new Webhook(TEST_WEBHOOK_SECRET);
  const msgId = `msg_${Date.now()}`;
  const timestamp = new Date();

  // sign() returns the full "v1,<base64_hmac>" header value.
  const signature = wh.sign(msgId, timestamp, body);

  const res = await request(app)
    .post("/api/webhooks/clerk")
    .set("Content-Type", "application/json")
    .set("svix-id", msgId)
    .set("svix-timestamp", String(Math.floor(timestamp.getTime() / 1000)))
    .set("svix-signature", signature)
    .send(body); // send as string so Content-Type is preserved correctly

  return res;
}

// ── Payload factories ─────────────────────────────────────────────────────────

function updatedPayload(opts: {
  clerkId: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): object {
  const emailId = "idn_primary";
  const email = opts.email ?? "test@example.com";
  return {
    type: "user.updated",
    data: {
      id: opts.clerkId,
      primary_email_address_id: emailId,
      email_addresses: [{ id: emailId, email_address: email }],
      first_name: opts.firstName !== undefined ? opts.firstName : "Alice",
      last_name: opts.lastName !== undefined ? opts.lastName : "Smith",
      username: opts.username !== undefined ? opts.username : null,
    },
  };
}

function deletedPayload(clerkId: string): object {
  return {
    type: "user.deleted",
    data: {
      id: clerkId,
      deleted: true,
      primary_email_address_id: "",
      email_addresses: [],
      first_name: null,
      last_name: null,
      username: null,
    },
  };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

const createdUserIds: number[] = [];

async function insertTestUser(
  overrides: Omit<Partial<typeof usersTable.$inferInsert>, "firstName" | "lastName"> & {
    firstName?: string | null;
    lastName?: string | null;
  } = {},
): Promise<typeof usersTable.$inferSelect> {
  const username = overrides.username ?? "test_webhook_user";
  const email = overrides.email ?? "test@example.com";
  const clerkId = overrides.clerkId ?? null;

  // A prior interrupted test run may leave one of these synthetic rows behind.
  // Remove only the exact test identity so the suite is repeatable against the
  // shared development database.
  await pool.query(
    `DELETE FROM users
     WHERE username = $1
        OR email = $2
        OR ($3::text IS NOT NULL AND clerk_id = $3)`,
    [username, email, clerkId],
  );

  // Insert via raw SQL to avoid Drizzle using schema columns that may not
  // exist yet in the live DB (first_name / last_name are added by ensureAuthSchema
  // at app startup; in tests we add them in beforeAll).
  const { rows } = await pool.query<typeof usersTable.$inferSelect>(
    `INSERT INTO users (username, email, clerk_id, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      username,
      email,
      clerkId,
      overrides.firstName ?? null,
      overrides.lastName ?? null,
    ],
  );
  const user = rows[0]!;
  createdUserIds.push(user.id);
  return user;
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Inject the test secret so the handler can verify signatures.
  process.env.CLERK_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  // Add first_name, last_name, clerk_id columns if they don't exist yet.
  // (ensureAuthSchema runs in index.ts at server start, not when importing app.ts.)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT`);
});

afterEach(async () => {
  for (const id of createdUserIds) {
    await pool.query("DELETE FROM users WHERE id = $1", [id]).catch(() => {});
  }
  createdUserIds.length = 0;
});

afterAll(async () => {
  delete process.env.CLERK_WEBHOOK_SECRET;
  await pool.end().catch(() => {});
});

// ── Signature verification ────────────────────────────────────────────────────

describe("POST /api/webhooks/clerk — signature verification", () => {
  it("returns 400 when Svix headers are missing", async () => {
    const res = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "user.updated", data: {} }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/svix/i);
  });

  it("returns 400 when the signature is invalid", async () => {
    const body = JSON.stringify({ type: "user.updated", data: {} });
    const res = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .set("svix-id", "msg_tampered")
      .set("svix-timestamp", String(Math.floor(Date.now() / 1000)))
      .set("svix-signature", "v1,invalidsignaturevalue")
      .send(Buffer.from(body));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });

  it("returns 200 for unknown event types (acknowledged and ignored)", async () => {
    const res = await buildSignedRequest({ type: "session.created", data: {} });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});

// ── user.updated ─────────────────────────────────────────────────────────────

describe("POST /api/webhooks/clerk — user.updated", () => {
  it("returns 200 and skips gracefully when no local user row exists", async () => {
    const res = await buildSignedRequest(
      updatedPayload({ clerkId: "user_clerk_no_local_row", email: "norow@example.com" }),
    );
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("syncs changed email when user is found by clerkId", async () => {
    const user = await insertTestUser({
      clerkId: "user_clerk_email_sync",
      email: "old@example.com",
      username: "email_sync_user",
    });

    const res = await buildSignedRequest(
      updatedPayload({ clerkId: "user_clerk_email_sync", email: "new@example.com" }),
    );
    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows[0]?.email).toBe("new@example.com");
  });

  it("syncs first_name and last_name from Clerk identity fields", async () => {
    const user = await insertTestUser({
      clerkId: "user_clerk_name_sync",
      email: "namesync@example.com",
      username: "name_sync_user",
    });

    const res = await buildSignedRequest(
      updatedPayload({
        clerkId: "user_clerk_name_sync",
        email: "namesync@example.com",
        firstName: "Bob",
        lastName: "Jones",
      }),
    );
    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ first_name: string; last_name: string }>(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows[0]?.first_name).toBe("Bob");
    expect(rows[0]?.last_name).toBe("Jones");
  });

  it("syncs both email and name when both change simultaneously", async () => {
    const user = await insertTestUser({
      clerkId: "user_clerk_both_sync",
      email: "both_old@example.com",
      username: "both_sync_user",
      firstName: "Old",
      lastName: "Name",
    });

    const res = await buildSignedRequest(
      updatedPayload({
        clerkId: "user_clerk_both_sync",
        email: "both_new@example.com",
        firstName: "New",
        lastName: "Name",
      }),
    );
    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ email: string; first_name: string }>(
      "SELECT email, first_name FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows[0]?.email).toBe("both_new@example.com");
    expect(rows[0]?.first_name).toBe("New");
  });

  it("back-fills clerkId and syncs name for legacy rows found only by email", async () => {
    const user = await insertTestUser({
      clerkId: undefined,
      email: "legacy@example.com",
      username: "legacy_user",
    });

    const res = await buildSignedRequest(
      updatedPayload({
        clerkId: "user_clerk_backfill",
        email: "legacy@example.com",
        firstName: "Legacy",
        lastName: "User",
      }),
    );
    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ clerk_id: string; first_name: string }>(
      "SELECT clerk_id, first_name FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows[0]?.clerk_id).toBe("user_clerk_backfill");
    expect(rows[0]?.first_name).toBe("Legacy");
  });

  it("does NOT rebind a row already attached to a different Clerk account (account-takeover guard)", async () => {
    // Row is bound to clerk_id = "original_owner" with email shared@example.com.
    const user = await insertTestUser({
      clerkId: "original_owner",
      email: "shared@example.com",
      username: "original_owner_user",
    });

    // A different Clerk account fires user.updated with the same email.
    const res = await buildSignedRequest(
      updatedPayload({
        clerkId: "attacker_clerk_id",
        email: "shared@example.com",
        firstName: "Attacker",
        lastName: "Attempt",
      }),
    );
    expect(res.status).toBe(200); // webhook acknowledged

    // The original row must NOT be reassigned to the attacker's clerkId.
    const { rows } = await pool.query<{ clerk_id: string; first_name: string | null }>(
      "SELECT clerk_id, first_name FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows[0]?.clerk_id).toBe("original_owner"); // unchanged
    expect(rows[0]?.first_name).toBeNull(); // name not updated
  });

  it("clears first_name and last_name when Clerk sends null", async () => {
    const user = await insertTestUser({
      clerkId: "user_clerk_null_name",
      email: "nullname@example.com",
      username: "null_name_user",
      firstName: "Had A Name",
      lastName: "Before",
    });

    const res = await buildSignedRequest(
      updatedPayload({
        clerkId: "user_clerk_null_name",
        email: "nullname@example.com",
        firstName: null,
        lastName: null,
      }),
    );
    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ first_name: string | null; last_name: string | null }>(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows[0]?.first_name).toBeNull();
    expect(rows[0]?.last_name).toBeNull();
  });
});

  it("does not attach a row already bound to a different clerkId after JIT email conflict (recycled-email guard)", async () => {
    // Simulate: user A (original_clerk) exists with email shared@example.com.
    const userA = await insertTestUser({
      clerkId: "original_clerk",
      email: "shared_jit@example.com",
      username: "user_a_original",
    });

    // User B signs in with the SAME email but a DIFFERENT Clerk ID.
    // The JIT insert will conflict on the email unique constraint.
    // The fallback re-fetch must look up by clerkId ("different_clerk"),
    // find nothing, and return 200 without attaching user A's row.
    //
    // We test the webhook path (which has the same guard) as a proxy,
    // since the JIT bridge runs in the session layer and can't be easily
    // triggered in integration tests without a real Clerk token.
    const res = await buildSignedRequest(
      updatedPayload({
        clerkId: "different_clerk",
        email: "shared_jit@example.com", // same email, different Clerk ID
        firstName: "Attacker",
      }),
    );
    // Webhook must succeed (200) but must NOT have updated user A's row.
    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ clerk_id: string; first_name: string | null }>(
      "SELECT clerk_id, first_name FROM users WHERE id = $1",
      [userA.id],
    );
    expect(rows[0]?.clerk_id).toBe("original_clerk"); // unchanged
    expect(rows[0]?.first_name).toBeNull(); // not overwritten
  });

// ── user.deleted ──────────────────────────────────────────────────────────────

describe("POST /api/webhooks/clerk — user.deleted", () => {
  it("returns 200 and skips gracefully when no local user row exists", async () => {
    const res = await buildSignedRequest(deletedPayload("user_clerk_ghost"));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("removes the local user row when user.deleted fires", async () => {
    const user = await insertTestUser({
      clerkId: "user_clerk_delete_me",
      email: "deleteme@example.com",
      username: "delete_me_user",
    });

    const res = await buildSignedRequest(deletedPayload("user_clerk_delete_me"));
    expect(res.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [user.id],
    );
    expect(rows).toHaveLength(0);

    // Row already removed — skip cleanup in afterEach.
    const idx = createdUserIds.indexOf(user.id);
    if (idx !== -1) createdUserIds.splice(idx, 1);
  });

  it("is idempotent — a second deletion webhook returns 200", async () => {
    const user = await insertTestUser({
      clerkId: "user_clerk_double_delete",
      email: "doubledelete@example.com",
      username: "double_delete_user",
    });

    await buildSignedRequest(deletedPayload("user_clerk_double_delete"));
    const res = await buildSignedRequest(deletedPayload("user_clerk_double_delete"));
    expect(res.status).toBe(200);

    const idx = createdUserIds.indexOf(user.id);
    if (idx !== -1) createdUserIds.splice(idx, 1);
  });
});

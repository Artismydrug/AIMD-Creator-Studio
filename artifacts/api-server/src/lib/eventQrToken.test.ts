import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateToken,
  verifyToken,
  signToken,
  TOKEN_TTL_HOURS,
  deriveOrganizerKey,
  isValidOrganizerKey,
} from "./eventQrToken";

// Fixed test secret — tests must not rely on process.env.SESSION_SECRET
const TEST_SECRET = "test-secret-do-not-use-in-prod";

/** Helpers that pin the secret for deterministic, environment-independent tests. */
function genToken(eventId: number): string {
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600;
  const sig = signToken(eventId, expiry, TEST_SECRET);
  return `${eventId}.${expiry}.${sig}`;
}

function verify(token: string) {
  return verifyToken(token, TEST_SECRET);
}

// ── QR token generation & verification ───────────────────────────────────────

describe("QR event check-in token", () => {
  const EVENT_ID = 42;

  describe("happy path — valid token", () => {
    it("generates a token that passes verification", () => {
      const token = genToken(EVENT_ID);
      const result = verify(token);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.eventId).toBe(EVENT_ID);
    });

    it("round-trips the event id for several ids", () => {
      for (const id of [1, 5, 99, 1000]) {
        const token = genToken(id);
        const result = verify(token);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.eventId).toBe(id);
      }
    });
  });

  describe("invalid_format — malformed tokens", () => {
    it("rejects a plain integer (no signature — forged plain ID)", () => {
      const result = verify(`${EVENT_ID}`);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_format");
    });

    it("rejects a two-part token (missing signature)", () => {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const result = verify(`${EVENT_ID}.${expiry}`);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_format");
    });

    it("rejects non-numeric event id or expiry", () => {
      for (const garbage of ["abc.def.ghi", "1.abc.def", "abc.123.def"]) {
        const result = verify(garbage);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe("invalid_format");
      }
    });

    it("rejects empty string", () => {
      const result = verify("");
      expect(result.ok).toBe(false);
    });
  });

  describe("invalid_signature — tampered tokens", () => {
    it("rejects a token with a forged signature", () => {
      const token = genToken(EVENT_ID);
      const [id, expiry] = token.split(".");
      const forged = `${id}.${expiry}.${"A".repeat(43)}`;
      const result = verify(forged);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_signature");
    });

    it("rejects a token where the event id has been swapped", () => {
      const token = genToken(EVENT_ID);
      const parts = token.split(".");
      const tampered = `999.${parts[1]}.${parts[2]}`;
      const result = verify(tampered);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_signature");
    });

    it("rejects a token signed with a different secret", () => {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const sig = signToken(EVENT_ID, expiry, "other-secret");
      const token = `${EVENT_ID}.${expiry}.${sig}`;
      const result = verify(token);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_signature");
    });
  });

  describe("expired — past-expiry tokens", () => {
    it("rejects a token with expiry in the past", () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 1;
      const sig = signToken(EVENT_ID, pastExpiry, TEST_SECRET);
      const expired = `${EVENT_ID}.${pastExpiry}.${sig}`;
      const result = verify(expired);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    });

    it("accepts a token expiring in the future", () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 60;
      const sig = signToken(EVENT_ID, futureExpiry, TEST_SECRET);
      const token = `${EVENT_ID}.${futureExpiry}.${sig}`;
      expect(verify(token).ok).toBe(true);
    });
  });

  describe("token ttl", () => {
    it("ttl constant is 24 hours", () => {
      expect(TOKEN_TTL_HOURS).toBe(24);
    });

    it("generated token expires approximately 24 h from now", () => {
      const before = Math.floor(Date.now() / 1000);
      const token = genToken(EVENT_ID);
      const expiry = parseInt(token.split(".")[1], 10);
      expect(Math.abs(expiry - (before + TOKEN_TTL_HOURS * 3600))).toBeLessThanOrEqual(2);
    });
  });
});

// ── Organizer key authorization ───────────────────────────────────────────────
// isValidOrganizerKey calls getSecret() internally — we pin SESSION_SECRET via env.

describe("organizer key authorization", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, SESSION_SECRET: TEST_SECRET };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("deriveOrganizerKey produces a deterministic 64-char hex string", () => {
    const key = deriveOrganizerKey(TEST_SECRET);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(deriveOrganizerKey(TEST_SECRET)).toBe(key); // deterministic
  });

  it("rejects missing key (undefined)", () => {
    expect(isValidOrganizerKey(undefined)).toBe(false);
  });

  it("rejects empty key", () => {
    expect(isValidOrganizerKey("")).toBe(false);
  });

  it("rejects a random string", () => {
    expect(isValidOrganizerKey("not-a-real-key")).toBe(false);
  });

  it("rejects a key derived from a different secret", () => {
    const wrongKey = deriveOrganizerKey("wrong-secret");
    expect(isValidOrganizerKey(wrongKey)).toBe(false);
  });

  it("accepts the correctly derived key", () => {
    const correctKey = deriveOrganizerKey(TEST_SECRET); // TEST_SECRET == SESSION_SECRET in env
    expect(isValidOrganizerKey(correctKey)).toBe(true);
  });

  it("fails closed when SESSION_SECRET is not set", () => {
    delete process.env.SESSION_SECRET;
    // Any supplied key must be rejected when the server has no secret configured
    expect(isValidOrganizerKey("any-key")).toBe(false);
  });
});

// ── Duplicate-scan idempotency (contract test) ────────────────────────────────
// The database enforces idempotency via UNIQUE(user_id, event_id) on
// event_attendances.  The endpoint detects an existing row and returns
// { alreadyCheckedIn: true } without inserting again.  This test verifies
// the token layer stays valid across two calls — the DB side is covered
// by the unique constraint documented in lib/db/src/schema/events.ts.

describe("duplicate-scan idempotency contract", () => {
  it("a valid token remains valid if verified twice (token itself is stateless)", () => {
    const token = genToken(7);
    const r1 = verify(token);
    const r2 = verify(token);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Both return the same eventId so the server's idempotent DB upsert fires correctly
    if (r1.ok && r2.ok) expect(r1.eventId).toBe(r2.eventId);
  });
});

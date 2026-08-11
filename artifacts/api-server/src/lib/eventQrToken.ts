/**
 * HMAC-SHA256 signed QR check-in token helpers.
 *
 * Token format: "{eventId}.{expiryUnixSec}.{base64urlHmac}"
 *
 * The signature covers both eventId and expiry so neither field can be
 * altered without invalidating the token. Constant-time comparison is used
 * for the HMAC equality check to prevent timing attacks.
 *
 * Security note: the HMAC approach is only as strong as token issuance control.
 * The /events/:id/qr-token endpoint MUST be restricted to event organizers.
 * This is enforced via verifyOrganizerKey() — a derived key from SESSION_SECRET.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_TTL_HOURS = 24;

export function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required for QR token signing. " +
      "Set it in your environment before starting the server."
    );
  }
  return secret;
}

/**
 * Derives a stable organizer key from a secret.
 * Must always be called with an explicit secret — never relies on the
 * environment fallback so callers control failure mode.
 */
export function deriveOrganizerKey(secret: string): string {
  return createHmac("sha256", secret).update("organizer-access-v1").digest("hex");
}

/**
 * Constant-time check of an organizer key supplied in a request header.
 * Returns false when the environment secret is missing (fail-closed).
 */
export function isValidOrganizerKey(supplied: string | undefined): boolean {
  if (!supplied) return false;
  try {
    const expected = deriveOrganizerKey(getSecret()); // throws if SESSION_SECRET absent
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false; // fail closed: missing secret → no valid key
  }
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function signToken(eventId: number, expiry: number, secret?: string): string {
  const payload = `${eventId}.${expiry}`;
  return b64url(createHmac("sha256", secret ?? getSecret()).update(payload).digest());
}

export function generateToken(eventId: number): string {
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600;
  const sig = signToken(eventId, expiry);
  return `${eventId}.${expiry}.${sig}`;
}

export type TokenVerifyResult =
  | { ok: true; eventId: number }
  | { ok: false; reason: "invalid_format" | "invalid_signature" | "expired" };

export function verifyToken(token: string, secret?: string): TokenVerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid_format" };

  const [rawId, rawExpiry, sig] = parts;
  const eventId = parseInt(rawId, 10);
  const expiry = parseInt(rawExpiry, 10);
  if (isNaN(eventId) || isNaN(expiry)) return { ok: false, reason: "invalid_format" };

  const expected = signToken(eventId, expiry, secret);

  // Constant-time compare to prevent timing-based guessing
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { ok: false, reason: "invalid_signature" };
    }
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  if (Math.floor(Date.now() / 1000) > expiry) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, eventId };
}

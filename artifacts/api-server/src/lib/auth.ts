import crypto from 'crypto';
import type { AuthUser } from '@workspace/api-zod';
import { db, sessionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { type Request, type Response } from 'express';
import * as client from 'openid-client';

export const ISSUER_URL = process.env.ISSUER_URL ?? 'https://replit.com/oidc';
export const SESSION_COOKIE = 'sid';
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// ── Mobile OIDC pending transaction ──────────────────────────────────────────
// The server generates all cryptographic material (state, nonce, code_verifier)
// and signs them into a short-lived HMAC token.  The mobile client holds this
// token opaquely and presents it in the token exchange; the server re-derives
// the crypto material from it rather than accepting client-supplied values.

export const MOBILE_TX_TTL_SECONDS = 10 * 60; // 10 minutes

export interface MobilePendingTransaction {
  codeVerifier: string;
  nonce: string;
  state: string;
  redirectUri: string;
  expiresAt: number; // Unix seconds
}

function getTransactionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is required for mobile auth transactions');
  return secret;
}

/**
 * Sign a pending mobile auth transaction into an opaque HMAC token.
 * Format: base64url(JSON) . base64url(HMAC-SHA256 of the payload)
 */
export function signMobileTransaction(tx: MobilePendingTransaction): string {
  const payload = Buffer.from(JSON.stringify(tx)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getTransactionSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

/**
 * Verify a signed mobile auth transaction token.
 * Returns the decoded transaction, or null if the signature is invalid or expired.
 */
export function verifyMobileTransaction(token: string): MobilePendingTransaction | null {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 1) return null;

  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const expected = crypto
    .createHmac('sha256', getTransactionSecret())
    .update(payload)
    .digest('base64url');

  let valid: boolean;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected, 'base64url'), Buffer.from(sig, 'base64url'));
  } catch {
    return null;
  }
  if (!valid) return null;

  let tx: MobilePendingTransaction;
  try {
    tx = JSON.parse(Buffer.from(payload, 'base64url').toString()) as MobilePendingTransaction;
  } catch {
    return null;
  }

  if (Math.floor(Date.now() / 1000) > tx.expiresAt) return null;
  return tx;
}

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID!,
    );
  }
  return oidcConfig;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString('hex');
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

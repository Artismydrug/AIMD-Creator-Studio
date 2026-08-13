import {
  MobileAuthCodeExchangeBody,
  MobileAuthCodeExchangeResponse,
  AuthGetCurrentUserResponse,
  MobileAuthLogoutResponse,
} from '@workspace/api-zod';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { Router, type IRouter, type Request, type Response } from 'express';
import * as oidc from 'openid-client';

import {
  clearSession,
  createSession,
  deleteSession,
  getOidcConfig,
  getSessionId,
  ISSUER_URL,
  MOBILE_TX_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL,
  signMobileTransaction,
  verifyMobileTransaction,
  type MobilePendingTransaction,
  type SessionData,
} from '../lib/auth';

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host =
    req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return '/';
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorStatus(
  value: Record<string, unknown>,
): number | string | undefined {
  if (typeof value.status === 'number' || typeof value.status === 'string') {
    return value.status;
  }
  if (
    typeof value.statusCode === 'number' ||
    typeof value.statusCode === 'string'
  ) {
    return value.statusCode;
  }
  return undefined;
}

function getSafeErrorMetadata(error: unknown) {
  if (!isRecord(error)) {
    return { errorName: typeof error };
  }

  const errorStatus = getErrorStatus(error);
  const causeStatus = isRecord(error.cause)
    ? getErrorStatus(error.cause)
    : undefined;

  return {
    errorName: error instanceof Error ? error.name : 'Error',
    errorStatus: errorStatus ?? causeStatus,
  };
}

/**
 * Upsert a user record from Replit OIDC claims.
 *
 * The existing usersTable uses integer serial IDs. We store the Replit
 * sub claim in the `replitId` column to link accounts on subsequent logins.
 */
async function upsertUser(claims: Record<string, unknown>) {
  const replitId = claims.sub as string;
  const email = (claims.email as string) || null;
  const firstName = (claims.first_name as string) || null;
  const lastName = (claims.last_name as string) || null;
  const profileImageUrl = (
    (claims.profile_image_url || claims.picture) as string | null
  ) ?? null;

  // Check if an existing DB user is linked to this Replit account
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.replitId, replitId));

  if (existing) {
    // Refresh avatar if available
    if (profileImageUrl && profileImageUrl !== existing.avatarUrl) {
      const [updated] = await db
        .update(usersTable)
        .set({ avatarUrl: profileImageUrl })
        .where(eq(usersTable.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // New user: also check by email to avoid duplicate rows for existing seeds
  if (email) {
    const [byEmail] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (byEmail) {
      // Link the Replit ID to the existing account
      const [linked] = await db
        .update(usersTable)
        .set({ replitId, avatarUrl: profileImageUrl ?? byEmail.avatarUrl })
        .where(eq(usersTable.id, byEmail.id))
        .returning();
      return linked;
    }
  }

  // Create brand-new user
  const username =
    (firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName) ||
    email?.split('@')[0] ||
    `creator_${replitId.slice(0, 8)}`;

  const [created] = await db
    .insert(usersTable)
    .values({
      username,
      email: email ?? `${replitId}@replit.user`,
      replitId,
      avatarUrl: profileImageUrl,
    })
    .returning();

  return created;
}

router.get('/auth/user', (req: Request, res: Response) => {
  res.json(
    AuthGetCurrentUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get('/login', async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: 'openid email profile offline_access',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'login consent',
    state,
    nonce,
  });

  setOidcCookie(res, 'code_verifier', codeVerifier);
  setOidcCookie(res, 'nonce', nonce);
  setOidcCookie(res, 'state', state);
  setOidcCookie(res, 'return_to', returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get('/callback', async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect('/api/login');
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect('/api/login');
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie('code_verifier', { path: '/' });
  res.clearCookie('nonce', { path: '/' });
  res.clearCookie('state', { path: '/' });
  res.clearCookie('return_to', { path: '/' });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect('/api/login');
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: (claims.first_name as string) ?? null,
      lastName: (claims.last_name as string) ?? null,
      profileImageUrl: dbUser.avatarUrl ?? null,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : (claims.exp as number | undefined),
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get('/logout', async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);
  const returnTo = getSafeReturnTo(req.query.returnTo);
  const postLogoutRedirectUrl = new URL(returnTo, `${origin}/`).href;

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: postLogoutRedirectUrl,
  });

  res.redirect(endSessionUrl.href);
});

// POST /mobile-auth/begin — server generates all OIDC crypto material and
// returns a signed transaction token + the full authorization URL.
// The mobile client holds the token opaquely and presents it in the exchange.
router.post('/mobile-auth/begin', async (req: Request, res: Response) => {
  const redirect_uri = req.body?.redirect_uri;
  if (!redirect_uri || typeof redirect_uri !== 'string') {
    res.status(400).json({ error: 'redirect_uri is required' });
    return;
  }

  try {
    const config = await getOidcConfig();

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const authUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri,
      scope: 'openid email profile offline_access',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_type: 'code',
      state,
      nonce,
    });

    const tx: MobilePendingTransaction = {
      codeVerifier,
      nonce,
      state,
      redirectUri: redirect_uri,
      expiresAt: Math.floor(Date.now() / 1000) + MOBILE_TX_TTL_SECONDS,
    };
    const transactionToken = signMobileTransaction(tx);

    res.json({ transactionToken, authUrl: authUrl.href });
  } catch (err) {
    req.log.error(getSafeErrorMetadata(err), 'Mobile auth begin error');
    res.status(500).json({ error: 'Failed to initialize mobile auth' });
  }
});

router.post(
  '/mobile-auth/token-exchange',
  async (req: Request, res: Response) => {
    const parsed = MobileAuthCodeExchangeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required parameters' });
      return;
    }

    const { code, transactionToken } = parsed.data;

    // Verify the server-signed transaction — rejects tampered/expired tokens
    const tx = verifyMobileTransaction(transactionToken);
    if (!tx) {
      res.status(400).json({ error: 'Invalid or expired transaction token — restart the login flow' });
      return;
    }

    try {
      const config = await getOidcConfig();

      // Reconstruct the callback URL the OIDC server redirected to.
      // The redirect_uri must exactly match what was used in the authorization
      // request; we use the server-stored value from the transaction.
      const callbackUrl = new URL(tx.redirectUri);
      callbackUrl.searchParams.set('code', code);
      callbackUrl.searchParams.set('state', tx.state);
      callbackUrl.searchParams.set('iss', ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: tx.codeVerifier,
        expectedNonce: tx.nonce,
        expectedState: tx.state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: 'No claims in ID token' });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: (claims.first_name as string) ?? null,
          lastName: (claims.last_name as string) ?? null,
          profileImageUrl: dbUser.avatarUrl ?? null,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : (claims.exp as number | undefined),
      };

      const sid = await createSession(sessionData);
      res.json(MobileAuthCodeExchangeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error(getSafeErrorMetadata(err), 'Mobile token exchange error');
      res.status(500).json({ error: 'Token exchange failed' });
    }
  },
);

router.post('/mobile-auth/logout', async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(MobileAuthLogoutResponse.parse({ success: true }));
});

export default router;

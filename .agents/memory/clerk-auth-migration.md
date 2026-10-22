---
name: Clerk auth migration
description: How Clerk replaced Replit Auth — bridge type, middleware, mobile token wiring, and test-session identity handling
---

## The bridge
Email bridge: `clerkAuth.ts` middleware looks up `users.email = sessionClaims.email`. On miss, JIT-inserts a new row with a sanitised username derived from the email prefix + 4-digit timestamp suffix. `users.replit_id` is preserved but no longer written.

**Why:** Email is unique + NOT NULL in the schema, available from Clerk for all auth methods, and works for both migrated and new users without needing to map Clerk's string IDs to serial integers.

**How to apply:** Check `req.dbUser` for presence (undefined = unauthenticated). All routes that previously checked `req.isAuthenticated()` now check `if (!req.dbUser)`.

## Type augmentation
Declared in `artifacts/api-server/src/middlewares/clerkAuth.ts`. Routes use `req.dbUser?.id` / `req.dbUser!.id` (after null-guard) instead of old `req.user.id`.

## Auth transport
- Web (aimd-academy): Clerk cookie session. Never add getToken() or Authorization: Bearer to browser API calls.
- Mobile (aimd-network): No cookie jar. setAuthTokenGetter(() => getToken()) wired in (tabs)/_layout.tsx via useAuth().getToken from @clerk/expo.

## Persistent mobile sessions and local unlock
Keep Clerk session tokens in its existing secure token cache; local biometric preferences must never duplicate credentials or tokens. Biometrics are an optional device unlock, not a replacement for a valid server session.

**Why:** A local inactivity timer cannot enforce server-side expiration, and copying tokens creates competing persistence and security behavior.

**How to apply:** Configure inactivity/session lifetime in managed Clerk settings when dashboard access permits. Keep biometric settings account-scoped; disabling or removing device biometrics must not silently bypass an enabled lock.

Restored-session recovery must be explicit: offer a bounded retry and user-initiated Clerk sign-out, rather than automatically discarding sessions when backend verification fails.

**Why:** A valid Clerk session can fail app verification because the API or database is unavailable, not because its stored token is stale. Automatic cache deletion would sign out healthy accounts without fixing the underlying outage.

**How to apply:** Diagnose API verification failures separately from authentication rejection. Keep SDK-managed secure storage; clear the API token getter and account query cache together after a successful reset, and preserve retry capability if sign-out fails.

The native app's inactivity rule is 30 days for a restored authentication session. Fresh credential-based sign-in starts a new inactivity period; account-only history must not immediately expire a new session.

**Why:** Users asked to stay signed in across restarts and re-authenticate after 30 inactive days. A local rule cannot extend Clerk's server lifetime or override revoked sessions.

**How to apply:** Keep local activity history associated with the authentication session, check it before refreshing on resume, and never let paused background heartbeats renew an unvalidated session.

## Staff workspace access
Use the same Clerk identity for creators, instructors, and admins, but gate Creator Studio HQ and instructor actions with database-authoritative instructor/admin roles.

**Why:** Creators should never need to see or enter a staff workspace, while staff need one protected operational area without managing a separate set of login credentials.

**How to apply:** Keep HQ and instructor API routes role-protected; unaffiliated accounts receive an ordinary access denial, never a server error. A missing linked instructor profile must not be parsed as an instructor record.

## Mobile native build configuration
Explicitly register `@clerk/expo` as an Expo config plugin when shipping an iOS build, and keep it on a release compatible with the app's Expo SDK.

**Why:** JavaScript-level autolinking alone can leave the Clerk pod absent from the generated CocoaPods target graph while React Native still tries to attach Clerk’s Swift Package dependencies, causing an iOS publish-time CocoaPods failure.

**How to apply:** After a Clerk Expo upgrade or native build failure, verify the plugin loads during the Expo workflow and rerun the production bundles before retrying the remote iOS build.

The production Expo bundling environment must also forward the managed Clerk publishable key as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and construct `EXPO_PUBLIC_CLERK_PROXY_URL` from the deployment domain plus the managed proxy path.

**Why:** The development command injects the key separately, so preview can work while a signed TestFlight build starts blank before Clerk renders.

**How to apply:** Keep this forwarding in the production bundle environment and fail the build when the managed publishable key is absent; never hand-edit the managed Clerk secrets.

## Programmatic test identity resolution
Always resolve the active Clerk session's local user before changing roles or tiers in an authenticated test.

**Why:** Resetting programmatic auth can create a new just-in-time local user even when the recreated session uses the same display name.

**How to apply:** Resolve the current session's local identity for each test run; do not assume a prior local record still owns the active session.

## Vite / Tailwind v4 requirements
- tailwindcss({ optimize: false }) in vite.config.ts — prevents @layer reordering in prod.
- @layer theme, base, clerk, components, utilities must come before @import tailwindcss in index.css.

## What was deleted
- lib/replit-auth-web/ — entire package removed
- artifacts/api-server/src/lib/auth.ts — Replit OIDC helpers
- artifacts/api-server/src/middlewares/authMiddleware.ts — old session middleware
- artifacts/api-server/src/routes/auth.ts — /login, /callback, /logout, /mobile-auth/*
- artifacts/aimd-network/lib/auth.tsx — Expo custom OIDC AuthProvider

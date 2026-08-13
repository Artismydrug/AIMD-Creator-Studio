---
name: Clerk auth migration
description: How Clerk replaced Replit Auth — bridge type, middleware, type augmentation, mobile token wiring
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

## Vite / Tailwind v4 requirements
- tailwindcss({ optimize: false }) in vite.config.ts — prevents @layer reordering in prod.
- @layer theme, base, clerk, components, utilities must come before @import tailwindcss in index.css.

## What was deleted
- lib/replit-auth-web/ — entire package removed
- artifacts/api-server/src/lib/auth.ts — Replit OIDC helpers
- artifacts/api-server/src/middlewares/authMiddleware.ts — old session middleware
- artifacts/api-server/src/routes/auth.ts — /login, /callback, /logout, /mobile-auth/*
- artifacts/aimd-network/lib/auth.tsx — Expo custom OIDC AuthProvider

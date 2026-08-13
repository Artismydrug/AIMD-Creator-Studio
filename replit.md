# AIMD Network — Art Is My Drug

A 501(c)(3) non-profit platform serving as a social, education, and career hub for independent music producers and creative artists. Two artifacts: the **AIMD Academy** (web portal) and the **AIMD Network** (Expo mobile app), both backed by a shared Express API server.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port varies via $PORT)
- `pnpm --filter @workspace/aimd-academy run dev` — web academy portal
- `pnpm --filter @workspace/aimd-network run dev` — Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + `@clerk/express`
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Auth: **Clerk** — `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- Validation: Zod (`zod/v4`), `drizzle-zod` (`lib/api-zod`)
- API client codegen: Orval from OpenAPI spec (`lib/api-client-react`)
- Web: Vite + React + Tailwind v4 + Wouter
- Mobile: Expo SDK 54 + `@clerk/expo`

## Where things live

- `lib/db/src/schema/` — Drizzle table definitions (source of truth for DB shape)
- `lib/api-zod/src/generated/` — generated Zod types (run codegen to regenerate)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `artifacts/api-server/src/middlewares/clerkAuth.ts` — JIT user provisioning middleware
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/aimd-academy/src/index.css` — design tokens (warm gallery / Open Studio theme)
- `artifacts/aimd-academy/src/App.tsx` — ClerkProvider + Wouter routing root
- `artifacts/aimd-network/app/_layout.tsx` — Expo root layout with ClerkProvider

## Architecture decisions

- **Clerk auth, email bridge**: All authentication flows through Clerk. `clerkAuth.ts` middleware JIT-provisions a local `users` row keyed by email on every authenticated request. The `users.replit_id` column is preserved but no longer written.
- **Session transport**: Web uses Clerk cookie sessions (no Bearer tokens in browser code). Mobile (Expo) uses `getToken()` → `setAuthTokenGetter` for Bearer auth on API calls.
- **Serial integer user IDs**: `users.id` is an auto-increment integer. All route handlers use `req.dbUser.id` (set by `clerkAuth` middleware) rather than Clerk's string user ID.
- **Tailwind v4 + Clerk**: `tailwindcss({ optimize: false })` in vite.config.ts prevents nested `@layer` reordering in production builds. `@layer theme, base, clerk, components, utilities` declared before `@import 'tailwindcss'`.
- **Tier enum fix**: DB stores `'academy'` (not `'workshop'`). Generated Zod types must match the DB enum exactly.

## Product

- **AIMD Academy** (web): Creator dashboard, daily habit log, studio post feed, workshop/enrollment, badge system, messaging, events, directory, job board, and Stripe-powered membership tiers.
- **AIMD Network** (mobile): Feed, creator directory, habits, messages, and event calendar — all behind Clerk email/password auth.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- When changing `zod/v4` enum values in generated types, also update the matching enum in `lib/api-client-react/src/generated/api.schemas.ts` — they are separate files.
- Expo packages must be pinned to SDK 54 versions (see setup-and-customization.md table).
- `http-proxy-middleware` installs a `_tmp_*` directory that Metro tries to watch; if the Expo workflow crashes with ENOENT on that path, just restart it.

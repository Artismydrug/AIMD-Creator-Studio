---
name: AIMD Network mobile app
description: Key facts about the AIMD Network Expo app, its API server integration, and auth design decisions
---

## Mobile app (artifacts/aimd-network)
- Font: DM Sans (DMSans_400Regular/500Medium/600SemiBold/700Bold via @expo-google-fonts/dm-sans)
- Dark-first design token system in hooks/useColors.ts
- Camera pinning: expo-camera with CameraView component
- CORS needs the API Server workflow running (artifacts/api-server)
- Auth: server-side OIDC transaction (see below); token stored as `auth_session_token` in expo-secure-store
- Auth token getter wired via `setAuthTokenGetter` in app/_layout.tsx
- User.id is `number` (integer from API), not string — important for message bubble alignment in conversation/[id].tsx

## Auth implementation (Replit OIDC — server-side transaction)
- Strategy: `/mobile-auth/begin` → signed transaction token + authUrl → `WebBrowser.openAuthSessionAsync` → code → `/mobile-auth/token-exchange` → Bearer session token
- **Why server-side**: server generates nonce/state/code_verifier; mobile client cannot supply or tamper with them. Client holds an opaque HMAC-signed transaction token (SESSION_SECRET).
- Sessions table: `sessions` (sid, sess jsonb, expire); ensureAuthSchema() provisions on startup
- Users table extended with `replit_id TEXT UNIQUE` (nullable for seed users)
- Web auth: @workspace/replit-auth-web package; useAuth() in Shell.tsx SidebarFooter
- All routes require req.isAuthenticated() → 401 if not; studio post list/get are public-read but writes require auth

## API schema / codegen quirk
**Why:** orval generates BOTH Zod schemas (api.ts) AND TypeScript interfaces (types/) for ANY named schema component. If the same name appears in both files, TS2308 fires.
**Fix pattern:** Use `$ref` to a DIFFERENTLY-NAMED component (e.g. `MobileAuthCodeInput` not `MobileAuthCodeExchangeBody`). Never use `{operationId}Body` or `{operationId}Response` as component names — those are reserved by orval for the generated Zod schemas.
**TDZ ordering:** After codegen, verify all `*Default` constants in api.ts appear BEFORE the schema that uses them. If not, manually reorder.

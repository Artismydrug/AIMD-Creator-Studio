---
name: Stripe setup quirks
description: Non-obvious issues found when wiring stripe-replit-sync into the AIMD monorepo API server
---

## stripe-replit-sync field names

The Replit connectors API returns `settings.secret` (not `settings.secret_key`) and `settings.publishable` (not `settings.publishable_key`) for the Stripe connector. The webhook secret is `settings.webhook_secret`.

**How to apply:** In `stripeClient.ts`, always read `settings.secret`, not `settings.secret_key`.

## runMigrations does not create tables automatically

`runMigrations({ databaseUrl })` creates the `stripe` schema and the `_migrations` tracking table but the underlying `connectAndMigrate` + `node-pg-migrate` call silently succeeds without actually applying the SQL migration files in the compiled bundle.

**Fix:** Run the SQL migration files directly against the database on first setup:
```bash
MIGRATIONS_DIR="$(node -e "require.resolve('stripe-replit-sync')" | xargs dirname)/migrations"
for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do psql "$DATABASE_URL" -f "$f"; done
```

**Why:** The bundled dist path resolution for the migrations directory works but the `migrate` function from the bundled library silently no-ops in this monorepo environment. Running the SQL directly is reliable.

## syncBackfill must receive `{ object: "all" }`

Calling `stripeSync.syncBackfill()` with no arguments defaults to `object: this.getSupportedEventTypes` (a function reference), which matches no case in the switch statement — nothing is synced.

**Fix:**
```typescript
stripeSync.syncBackfill({ object: 'all' } as any)
```

**Why:** The TypeScript types may not expose `object: "all"` but the JS switch case requires the string `"all"` to trigger the full sync.

## Seed products script must use connector API, not env vars

The seed script (`scripts/src/seed-products.ts`) uses the Replit connectors API directly (`REPLIT_CONNECTORS_HOSTNAME` + `REPL_IDENTITY`). It does NOT work from a plain shell `node` invocation — it requires the Replit workflow environment where these env vars are populated.

**Run via:** `pnpm --filter @workspace/scripts exec tsx src/seed-products.ts` (from within the Replit workflow context, not bare shell).

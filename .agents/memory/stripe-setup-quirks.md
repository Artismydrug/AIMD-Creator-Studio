---
name: Stripe setup quirks
description: Non-obvious issues found when wiring stripe-replit-sync into the AIMD monorepo API server
---

## stripe-replit-sync field names

The Replit connectors API returns `settings.secret` (not `settings.secret_key`) and `settings.publishable` (not `settings.publishable_key`) for the Stripe connector. A managed webhook secret may not be exposed in connector settings.

**How to apply:** In `stripeClient.ts`, always read `settings.secret`, not `settings.secret_key`.

## Managed webhook verification

When no webhook secret is supplied in configuration, `stripe-replit-sync` securely loads the managed endpoint secret from its own Stripe metadata table during `processWebhook`.

**Why:** Re-verifying the same payload with a secret expected from connector settings caused valid payment events to fail, while the sync library already had access to the managed secret.

**How to apply:** Pass the exact raw request body and Stripe signature to `processWebhook`; only parse or apply app-specific event handling after that call succeeds. Do not add a second secret-dependent verification layer.

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

## Managed Payments constraints on Checkout

This Stripe account has Managed Payments enabled. `checkout.sessions.create` rejects `payment_method_types` entirely, and every product sold (including ad-hoc `price_data.product_data`) must carry a `tax_code` (memberships use `txcd_10000000`, electronically supplied services).

**How to apply:** Never pass `payment_method_types`; set `tax_code` on all Stripe products and inline product_data, or session creation fails at runtime.

## Product renames evade sync and search

The incremental `syncBackfill` cursor is creation-based, so product RENAMES don't propagate to the DB mirror until a product.updated webhook lands. Separately, `stripe.products.search` matches loosely and its index lags — it can return "X Annual" when queried for "X". List products and match names exactly instead of trusting search.

## Web entitlement principles

**Why:** delayed/reordered Stripe events can otherwise re-grant cancelled tiers or clobber concurrent upgrades.
**How to apply:** trust only signature-verified webhooks or server-retrieved sessions; verify the subscription is still active before granting; make tier writes rank-conditional in SQL (never downgrade on grant); reuse one Stripe customer per user so cancellation reconciles across all their subscriptions.

## Catalog seeding must run in the managed workflow

Stripe catalog writes through the Replit connector do not work from a plain shell process because connector identity is only injected into the managed workflow environment.

**Why:** One-off shell and connector attempts can appear credential-less even though the configured API workflow can seed and sync successfully.

**How to apply:** Run catalog seed commands through the managed API workflow environment, then restore the normal service command and verify the synced catalog endpoint.

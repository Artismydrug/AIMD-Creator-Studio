---
name: DB schema changes
description: How to apply drizzle schema changes in this workspace
---
`pnpm --filter @workspace/db run push` (and push-force) fail headless: drizzle-kit prompts interactively (rename-vs-create resolver) and there is no TTY.
**Why:** challenge tables exist in the DB but not in the drizzle schema (created by ensureChallengeTables), so push always hits the resolver prompt.
**How to apply:** edit the drizzle schema files, then run the equivalent SQL on development via executeSql (ALTER TABLE ... IF NOT EXISTS / CREATE TABLE IF NOT EXISTS). Keep schema + SQL in lockstep. For managed PostgreSQL, Publish handles the production schema diff; never add production DDL or startup migrations.

Parallel test workers can race on `CREATE TABLE IF NOT EXISTS` and PostgreSQL may surface a duplicate internal type/constraint even when the table wins creation.
**Why:** Vitest route suites share the development database and initialize additive tables independently.
**How to apply:** serialize shared test schema setup or tolerate only the known duplicate-object errors; never hide unrelated database failures.

Prepare schema repairs before concurrent data-changing tests rather than repeatedly altering constraints inside test/startup initialization.
**Why:** shared-table DDL and foreign-key locks can deadlock account deletion even when suites use different disposable users.
**How to apply:** keep schema definitions aligned, apply development repairs once, and let Publish handle production diffs; do not introduce runtime production migration code.

---
name: DB schema changes
description: How to apply drizzle schema changes in this workspace
---
`pnpm --filter @workspace/db run push` (and push-force) fail headless: drizzle-kit prompts interactively (rename-vs-create resolver) and there is no TTY.
**Why:** challenge tables exist in the DB but not in the drizzle schema (created by ensureChallengeTables), so push always hits the resolver prompt.
**How to apply:** edit the drizzle schema files, then run the equivalent SQL manually via executeSql (ALTER TABLE ... IF NOT EXISTS / CREATE TABLE IF NOT EXISTS). Keep schema + SQL in lockstep. Remember prod needs the same SQL after publish.

# Creator Studio — staged backend update

## Scope and release boundary

Prepared only. No production database changes, production data writes, uploads,
or publishing are performed by this package.

Production uses Replit-managed PostgreSQL. **Publish owns the schema migration.**
The Drizzle definitions already contain these changes and development already
has them. Do not add a separate production migration runner, deploy-build DDL,
startup DDL, or a second schema-push command.

The accompanying `creator-studio-schema-preflight.sql` is SELECT-only catalog
inspection, not a migration script. Bind `$1` to `public` and use a read-only
connection. It returns 22 checks:

- `ready`: the definition already matches.
- `pending`: an additive object is absent.
- `conflict`: an existing definition differs — stop and investigate.

No account details, messages, reference images, or artwork are read by that query.

## Expected managed Publish diff

The staging review found these ten additive statements, with no reported
structural data loss, backwards-incompatibility warnings, drops, truncations,
renames, or removals. Publish recomputes its plan; do not assume a saved review
authorizes a later, different plan.

| Change | Existing-data compatibility |
|---|---|
| Create `creator_portfolio_categories` | New empty table; member-owned categories, ordered by position. |
| Create `message_send_receipts` | New empty table; composite sender/request-ID primary key prevents duplicate retry identities. No message body is copied. |
| Add nullable `studio_posts.portfolio_category_id` | Existing works remain uncategorized; no artwork is deleted or reassigned. |
| Add `tattoo_bookings.request_type`, NOT NULL, default `tattoo` | Existing bookings keep their original tattoo meaning; current forms support tattoo, painting and other. This does not introduce arbitrary new form types. |
| Add `users.portfolio_categories_configured`, NOT NULL, default `false` | Existing profiles retain the legacy-category fallback until configured. |
| Add category owner → user foreign key, ON DELETE CASCADE | Only new category records cascade when their owner is deleted. |
| Add receipt sender → user foreign key, ON DELETE CASCADE | Only new receipt records cascade when their sender is deleted. |
| Add category owner/position/id index | Supports ordered member categories. |
| Add post category → category foreign key, ON DELETE SET NULL | Removing a category preserves its artwork. |
| Add post category index | Supports gallery filtering. |

Sources of truth: `lib/db/src/schema/creator-portfolio-categories.ts`,
`message-send-receipts.ts`, `studio-posts.ts`, `tattoo-bookings.ts`, and `users.ts`.
No additional schema changes are needed for these features.

## Verification before approval

1. Run `pnpm --filter @workspace/aimd-network run check:release`.
2. Run `pnpm --filter @workspace/api-server exec vitest run --maxWorkers=1 --no-file-parallelism`.
   Backend route tests use disposable development fixtures and must not target production.
3. Run both artifact typechecks. The API suite includes the read-only schema
   preflight, including deliberate incompatible expectations to prove conflicts
   are reported.
4. Inspect the fresh managed development→production diff. Stop if it includes
   changes beyond this scope, destructive operations, or unexpected warnings.
5. Run the catalog preflight against production read-only. `pending` is expected
   before Publish; any `conflict` requires investigation, not an existence-only bypass.

## Controlled rollout — user approval required

1. Confirm a recent recoverable production checkpoint/backup before publishing.
2. Choose a lower-traffic window. Additive is not zero operational risk: index
   creation and foreign-key validation can briefly lock or wait on tables.
3. Publish the reviewed backend through Replit's normal Publish flow. Review
   the actual schema plan; **do not choose overwrite production data**.
4. Confirm `/api/healthz`, then rerun the read-only schema preflight: all checks
   must be `ready` before distributing a mobile build that uses these features.
5. Use a disposable account in a controlled test to verify category
   add/rename/remove/assignment, an inquiry of each supported type, and a
   repeated message retry with the same request ID. Confirm removing a category
   does not remove its work, and message retries do not create duplicate messages.
6. Complete fresh TestFlight device checks before App Store submission.

If application rollback is needed, prefer rolling back application code while
leaving these compatible additions in place. Do not drop new tables/columns
after creators start using them. Investigate any partially completed managed
Publish failure using the actual post-failure diff; do not run manual DDL.

This staging work does not clear the separate moderation/age-rating, EU trader,
dependency-security, or real-device verification items from the readiness audit.

## Sandbox verification record — October 21, 2026

- Backend: 47 test files, 430 tests passed.
- Mobile: 167 behavioral/regression tests passed, plus source release contracts.
  `check:release` includes the previously unlisted monthly-streak, launch-polish,
  Metro, inquiry and portfolio checks so future runs retain this coverage.
- Both mobile and API TypeScript checks passed.
- Development catalog preflight: all 22 definitions match (also checked in the API suite).
- Production catalog preflight, read-only: 22 expected additions pending,
  zero conflicting existing definitions.
- Managed schema diff: ten additive statements; no reported structural data loss
  or backwards-incompatibility warnings.

This is a staging snapshot, not permission to apply a future changed diff.
Existing message receipts are not backfilled: retry protection uses request IDs
recorded by the updated backend; it does not retroactively deduplicate old messages.

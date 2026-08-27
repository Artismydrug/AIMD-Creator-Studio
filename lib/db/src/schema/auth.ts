import { index, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Sessions table for Replit Auth — do not drop.
export const sessionsTable = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
);

/**
 * Clerk identities that have completed account deletion.
 *
 * The tombstone prevents an unexpired mobile session token from causing the
 * auth middleware to JIT-provision a replacement local user row.
 */
export const deletedClerkUsersTable = pgTable('deleted_clerk_users', {
  clerkId: text('clerk_id').primaryKey(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
});

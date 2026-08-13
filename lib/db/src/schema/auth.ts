import { index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

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

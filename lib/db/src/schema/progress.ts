import { pgTable, serial, integer, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * One row per creator per local calendar date.
 * The local_date is determined server-side using the creator's IANA timezone.
 * Unique on (user_id, local_date) — duplicate check-ins on the same local day
 * are handled with ON CONFLICT DO NOTHING.
 */
export const creatorDailyCheckinsTable = pgTable(
  "creator_daily_checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD in the creator's local timezone */
    localDate: date("local_date", { mode: "string" }).notNull(),
    /** IANA timezone used to compute localDate, e.g. "America/New_York" */
    timezone: text("timezone").notNull(),
    /** Running streak length as of this check-in */
    streakDay: integer("streak_day").notNull().default(1),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("creator_daily_checkins_user_date_unique").on(
      t.userId,
      t.localDate,
    ),
  ],
);

/**
 * One row per creator per local calendar date for the daily reward spin.
 * Weighted outcome is one of 5, 10, 20, or 50 points.
 * Unique on (user_id, local_date) — retrying on the same day returns the
 * existing row without a new spin.
 */
export const creatorRewardSpinsTable = pgTable(
  "creator_reward_spins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD in the creator's local timezone */
    localDate: date("local_date", { mode: "string" }).notNull(),
    /** IANA timezone used to compute localDate */
    timezone: text("timezone").notNull(),
    /** Points awarded: 5, 10, 20, or 50 */
    pointsAwarded: integer("points_awarded").notNull(),
    spunAt: timestamp("spun_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("creator_reward_spins_user_date_unique").on(
      t.userId,
      t.localDate,
    ),
  ],
);

export const insertCreatorDailyCheckinSchema = createInsertSchema(
  creatorDailyCheckinsTable,
).omit({ id: true, checkedInAt: true });
export type InsertCreatorDailyCheckin = z.infer<
  typeof insertCreatorDailyCheckinSchema
>;
export type CreatorDailyCheckin =
  typeof creatorDailyCheckinsTable.$inferSelect;

export const insertCreatorRewardSpinSchema = createInsertSchema(
  creatorRewardSpinsTable,
).omit({ id: true, spunAt: true });
export type InsertCreatorRewardSpin = z.infer<
  typeof insertCreatorRewardSpinSchema
>;
export type CreatorRewardSpin = typeof creatorRewardSpinsTable.$inferSelect;

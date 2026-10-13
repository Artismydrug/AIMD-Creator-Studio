import { boolean, integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationPreferencesTable = pgTable("user_notification_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  directMessages: boolean("direct_messages").notNull().default(false),
  newFollowers: boolean("new_followers").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreferences = typeof notificationPreferencesTable.$inferSelect;

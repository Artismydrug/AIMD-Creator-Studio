import { check, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const notificationPushDevicesTable = pgTable("notification_push_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expoPushToken: text("expo_push_token").notNull(),
  platform: text("platform").$type<"ios" | "android">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("notification_push_devices_token_unique").on(table.expoPushToken),
  index("notification_push_devices_user_idx").on(table.userId),
  check("notification_push_devices_platform_check", sql`${table.platform} IN ('ios', 'android')`),
]);

export type NotificationPushDevice = typeof notificationPushDevicesTable.$inferSelect;

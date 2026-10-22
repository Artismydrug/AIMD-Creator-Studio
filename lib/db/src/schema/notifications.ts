import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { studioPostsTable } from "./studio-posts";
import { tattooBookingsTable } from "./tattoo-bookings";

export const notificationTypes = [
  "direct_message",
  "follow",
  "like",
  "critique",
  "commission_inquiry",
] as const;

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientUserId: integer("recipient_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  type: text("type").$type<(typeof notificationTypes)[number]>().notNull(),
  conversationId: integer("conversation_id"),
  postId: integer("post_id").references(() => studioPostsTable.id, {
    onDelete: "cascade",
  }),
  bookingId: integer("booking_id").references(() => tattooBookingsTable.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => [
  check(
    "notifications_type_check",
    sql`${table.type} IN ('direct_message', 'follow', 'like', 'critique', 'commission_inquiry')`,
  ),
  uniqueIndex("notifications_commission_booking_unique").on(table.bookingId),
]);

export type Notification = typeof notificationsTable.$inferSelect;
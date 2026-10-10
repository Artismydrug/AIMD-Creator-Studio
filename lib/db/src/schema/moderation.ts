import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const contentReportsTable = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  // Logical references preserve a report after the reported item is removed.
  postId: integer("post_id"),
  reportedUserId: integer("reported_user_id"),
  messageId: integer("message_id"),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("content_reports_one_target", sql`
    NOT (${table.postId} IS NOT NULL AND ${table.messageId} IS NOT NULL)
    AND (${table.postId} IS NOT NULL OR ${table.messageId} IS NOT NULL OR ${table.reportedUserId} IS NOT NULL)
  `),
  index("content_reports_status_created_idx").on(table.status, table.createdAt),
]);

export const contentReportReviewsTable = pgTable("content_report_reviews", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => contentReportsTable.id, { onDelete: "cascade" }),
  reviewerId: integer("reviewer_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("content_report_reviews_action_check", sql`${table.action} IN ('review', 'resolve', 'dismiss', 'remove_content')`),
  index("content_report_reviews_report_idx").on(table.reportId, table.createdAt),
]);

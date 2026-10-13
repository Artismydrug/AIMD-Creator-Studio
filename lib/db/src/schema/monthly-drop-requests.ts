import { pgTable, serial, integer, text, timestamp, unique, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { monthlyDropsTable } from "./monthly-drops";

export const monthlyDropRequestsTable = pgTable("monthly_member_drop_requests", {
  id: serial("id").primaryKey(),
  dropId: integer("drop_id").notNull().references(() => monthlyDropsTable.id),
  // Preserve anonymous stock/fulfillment history after account deletion.
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("monthly_member_drop_requests_once").on(t.dropId, t.userId),
  index("monthly_member_drop_requests_drop_idx").on(t.dropId, t.status),
  check("monthly_member_drop_requests_status_check", sql`${t.status} IN ('pending', 'approved', 'declined', 'fulfilled')`),
]);

export const insertMonthlyDropRequestSchema = createInsertSchema(monthlyDropRequestsTable).omit({ id: true, requestedAt: true, updatedAt: true });
export type MonthlyDropRequest = typeof monthlyDropRequestsTable.$inferSelect;

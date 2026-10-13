import { pgTable, serial, text, integer, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const monthlyDropsTable = pgTable("monthly_member_drops", {
  id: serial("id").primaryKey(),
  monthKey: text("month_key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  items: text("items").array().notNull(),
  stock: integer("stock").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("monthly_member_drops_stock_check", sql`${t.stock} >= 0`),
  check("monthly_member_drops_status_check", sql`${t.status} IN ('draft', 'open', 'closed')`),
]);

export const insertMonthlyDropSchema = createInsertSchema(monthlyDropsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type MonthlyDrop = typeof monthlyDropsTable.$inferSelect;

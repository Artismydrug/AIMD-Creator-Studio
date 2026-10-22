import { pgTable, serial, text, boolean, integer, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  tier: text("tier").notNull().default("free"), // free | legacy workshop | academy | pro
  studioReadyBadge: boolean("studio_ready_badge").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Public profile fields
  discipline: text("discipline"),
  bio: text("bio"),
  location: text("location"),
  bookingOpen: boolean("booking_open").notNull().default(false),
  portfolioUrl: text("portfolio_url"),
  inquiryFormConfig: jsonb("inquiry_form_config").$type<Record<string, unknown> | null>(),
  portfolioCategoriesConfigured: boolean("portfolio_categories_configured").notNull().default(false),
  // Replit Auth: links Replit OIDC sub claim to this integer-id user row
  replitId: text("replit_id").unique(),
  // Clerk Auth: links Clerk user ID to this integer-id user row
  clerkId: text("clerk_id").unique(),
  // Identity: synced from Clerk; separate from the app-level `username` handle
  firstName: text("first_name"),
  lastName: text("last_name"),
  // Admin: full control over events, challenges, and point awards
  isAdmin: boolean("is_admin").notNull().default(false),
  // AIMD Points balance (reward tiers: T-shirt, event ticket, workshop lesson)
  points: integer("points").notNull().default(0),
  // Creator's IANA timezone saved from first check-in; used for local-date calculations
  timezone: text("timezone"),
  // Stripe: set when a web subscription checkout completes; used to reconcile
  // tier changes from subscription lifecycle webhooks
  stripeCustomerId: text("stripe_customer_id").unique(),
});

// Ledger of every point award — auditable history behind users.points
export const pointAwardsTable = pgTable("point_awards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  awardedBy: integer("awarded_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // A creator can only be awarded a given week's challenge win once
  uniqueIndex("point_awards_challenge_win_unique")
    .on(t.userId, t.reason)
    .where(sql`reason LIKE 'Weekly Challenge winner%'`),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sponsorshipsTable = pgTable("sponsorships", {
  id: serial("id").primaryKey(),
  sponsorUserId: integer("sponsor_user_id").references(() => usersTable.id),
  sponsorName: text("sponsor_name").notNull(),
  sponsorAvatarUrl: text("sponsor_avatar_url"),
  creatorId: integer("creator_id").references(() => usersTable.id),
  creatorName: text("creator_name").notNull(),
  amount: real("amount").notNull(),
  message: text("message"),
  tier: text("tier").notNull().$type<"kit" | "tuition" | "full-ride">(),
  status: text("status").notNull().$type<"pending" | "active" | "completed">().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  anonymous: boolean("anonymous").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

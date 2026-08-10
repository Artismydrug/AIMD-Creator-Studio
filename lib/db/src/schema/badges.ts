import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  workshopId: integer("workshop_id"),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBadgeSchema = createInsertSchema(badgesTable).omit({ id: true, earnedAt: true });
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badgesTable.$inferSelect;

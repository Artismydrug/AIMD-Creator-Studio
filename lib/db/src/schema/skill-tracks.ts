import { pgTable, serial, integer, text, boolean, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const skillTracksTable = pgTable("skill_tracks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  artForm: text("art_form").notNull(),
  totalMilestones: integer("total_milestones").notNull().default(5),
  completedMilestones: integer("completed_milestones").notNull().default(0),
  percentComplete: real("percent_complete").notNull().default(0),
  status: text("status").notNull().default("in_progress"), // in_progress | certified | paused
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("skill_tracks_user_status_idx").on(table.userId, table.status)]);

export const skillMilestonesTable = pgTable("skill_milestones", {
  id: serial("id").primaryKey(),
  skillTrackId: integer("skill_track_id").notNull().references(() => skillTracksTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const insertSkillTrackSchema = createInsertSchema(skillTracksTable).omit({ id: true, createdAt: true, percentComplete: true, completedMilestones: true });
export type InsertSkillTrack = z.infer<typeof insertSkillTrackSchema>;
export type SkillTrack = typeof skillTracksTable.$inferSelect;
export type SkillMilestone = typeof skillMilestonesTable.$inferSelect;

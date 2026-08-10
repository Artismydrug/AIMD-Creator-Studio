import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { workshopsTable } from "./workshops";
import { workshopModulesTable } from "./workshops";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull().references(() => workshopModulesTable.id, { onDelete: "cascade" }),
  submissionUrl: text("submission_url"),
  submissionNote: text("submission_note"),
  feedback: text("feedback"),
  grade: text("grade"),
  status: text("status").notNull().default("pending"), // pending | reviewed | approved | revision_requested
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, submittedAt: true, feedback: true, grade: true, status: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;

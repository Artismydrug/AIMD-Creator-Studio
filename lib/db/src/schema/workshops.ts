import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workshopsTable = pgTable("workshops", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorName: text("instructor_name"),
  thumbnailUrl: text("thumbnail_url"),
  tier: text("tier").notNull().default("free"), // free | workshop | pro
  category: text("category").notNull(),
  totalModules: integer("total_modules").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workshopModulesTable = pgTable("workshop_modules", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  order: integer("order").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  completedModules: integer("completed_modules").notNull().default(0),
  status: text("status").notNull().default("active"), // active | completed | paused
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const completedModulesTable = pgTable("completed_modules", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => enrollmentsTable.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull().references(() => workshopModulesTable.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkshopSchema = createInsertSchema(workshopsTable).omit({ id: true, createdAt: true });
export const insertWorkshopModuleSchema = createInsertSchema(workshopModulesTable).omit({ id: true, createdAt: true });
export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, createdAt: true });
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type InsertWorkshopModule = z.infer<typeof insertWorkshopModuleSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Workshop = typeof workshopsTable.$inferSelect;
export type WorkshopModule = typeof workshopModulesTable.$inferSelect;
export type Enrollment = typeof enrollmentsTable.$inferSelect;

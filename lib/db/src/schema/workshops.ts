import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workshopsTable = pgTable("workshops", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorName: text("instructor_name"),
  thumbnailUrl: text("thumbnail_url"),
  previewVideoUrl: text("preview_video_url"),
  isPublished: boolean("is_published").notNull().default(false),
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
  previewVideoUrl: text("preview_video_url"),
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
  accessSource: text("access_source").notNull().default("subscription"), // subscription | participant
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("enrollments_user_workshop_idx").on(table.userId, table.workshopId)]);

export const completedModulesTable = pgTable("completed_modules", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => enrollmentsTable.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull().references(() => workshopModulesTable.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workshopVideoUploadsTable = pgTable("workshop_video_uploads", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull().unique(),
  mediaPath: text("media_path").unique(),
  kind: text("kind").$type<"preview" | "lesson">().notNull(),
  contentType: text("content_type").notNull(),
  expectedSize: integer("expected_size").notNull(),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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

/**
 * Instructor & Creator Studio schema
 *
 * Adds durable tables for:
 *   - Authoritative app roles (creator / instructor / admin)
 *   - Verified instructor profiles with nullable linked user
 *   - Workshop instructor ownership
 *   - Drill prompt with 30-second max enforcement
 *   - Assignment capture source, measured duration, and multi-format feedback
 *
 * All tables use additive columns only — no existing rows are altered.
 */

import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { workshopsTable, workshopModulesTable } from "./workshops";
import { assignmentsTable } from "./assignments";

// ── App-level roles ────────────────────────────────────────────────────────────

/**
 * Authoritative role grants for users.
 * The DB role is the source of truth; Clerk public_metadata.aimdRole is
 * synced for convenience only and never bypasses this table.
 */
export const userRolesTable = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  /** creator | instructor | admin */
  role: text("role").notNull().default("creator"),
  grantedBy: integer("granted_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Instructor profiles ───────────────────────────────────────────────────────

/**
 * Verified instructor profiles.
 * `userId` is nullable so an instructor record can be created before the
 * person has a Clerk/DB account (admin links them later).
 */
export const instructorProfilesTable = pgTable("instructor_profiles", {
  id: serial("id").primaryKey(),
  /** Nullable — linked once the person creates their account. */
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "set null" })
    .unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  /** Slug used in URLs and Clerk metadata.mentorSlug */
  mentorSlug: text("mentor_slug").notNull().unique(),
  /** Whether this instructor's profile is publicly visible. */
  verified: boolean("verified").notNull().default(false),
  specialties: text("specialties"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Workshop instructor ownership ─────────────────────────────────────────────

/**
 * Maps an instructor profile to the workshop(s) they own/teach.
 * Instructors may only mutate content on workshops they are listed on.
 */
export const workshopInstructorsTable = pgTable(
  "workshop_instructors",
  {
    id: serial("id").primaryKey(),
    workshopId: integer("workshop_id")
      .notNull()
      .references(() => workshopsTable.id, { onDelete: "cascade" }),
    instructorId: integer("instructor_id")
      .notNull()
      .references(() => instructorProfilesTable.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("workshop_instructors_unique").on(t.workshopId, t.instructorId),
  ],
);

// ── Drill prompts ──────────────────────────────────────────────────────────────

/**
 * A timed drill prompt attached to a workshop module.
 * The server enforces maxDurationSeconds <= 30 for all drills.
 */
export const drillPromptsTable = pgTable("drill_prompts", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => workshopModulesTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  /** Hard-capped at 30 by the server; stored for audit. */
  maxDurationSeconds: integer("max_duration_seconds").notNull().default(30),
  createdBy: integer("created_by").references(() => instructorProfilesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Assignment media uploads (drill gate) ──────────────────────────────────────

/**
 * Durable record of a private assignment video that passed the server-side
 * ffprobe 30-second gate at upload time.
 *
 * POST /assignments will ONLY accept a submissionUrl that resolves to an
 * unconsumed row here owned by the same user. This closes the bypass where a
 * creator could submit any owned private object that never passed the drill
 * duration check. The measured duration recorded here is authoritative — the
 * client-claimed duration is never trusted.
 */
export const assignmentMediaUploadsTable = pgTable(
  "assignment_media_uploads",
  {
    id: serial("id").primaryKey(),
    /** Owner of the upload — must match the submitting user. */
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Normalized private object path, e.g. `/objects/uploads/<uuid>`. Unique. */
    objectPath: text("object_path").notNull(),
    /** Authoritative measured duration in whole seconds (ceil of ffprobe value). */
    measuredDurationSeconds: integer("measured_duration_seconds").notNull(),
    /** How the video was captured: native_camera | media_library | upload */
    captureSource: text("capture_source"),
    /** SHA-256 of the stored bytes for audit. */
    sha256: text("sha256"),
    /** Content type of the stored object. */
    contentType: text("content_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Assignment this upload was bound to once consumed (nullable until used). */
    claimedAssignmentId: integer("claimed_assignment_id").references(
      () => assignmentsTable.id,
      { onDelete: "set null" },
    ),
    /** When the upload was consumed by an assignment submission (nullable). */
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("assignment_media_uploads_object_path_unique").on(t.objectPath),
  ],
);

// ── Assignment extensions ─────────────────────────────────────────────────────

/**
 * Extended metadata for assignment submissions.
 * One row per assignment (1:1 with assignments.id), stored as a separate
 * table so existing assignment rows are never broken.
 */
export const assignmentExtensionsTable = pgTable("assignment_extensions", {
  id: serial("id").primaryKey(),
  /** Real FK to assignments.id — 1:1, cascades on assignment delete. */
  assignmentId: integer("assignment_id")
    .notNull()
    .unique()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  /** How the video was captured: native_camera | media_library | upload */
  captureSource: text("capture_source"),
  /** Measured duration in seconds from ffprobe — authoritative. */
  measuredDurationSeconds: integer("measured_duration_seconds"),
  /** Text critique from the reviewer. */
  feedbackText: text("feedback_text"),
  /** Private audio feedback object path. */
  feedbackAudioUrl: text("feedback_audio_url"),
  /** Private video feedback object path. */
  feedbackVideoUrl: text("feedback_video_url"),
  /** Reviewer user ID (instructor or admin). */
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  /** When the reviewer submitted their feedback. */
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertUserRoleSchema = createInsertSchema(userRolesTable).omit({
  id: true,
  grantedAt: true,
});

export const insertInstructorProfileSchema = createInsertSchema(
  instructorProfilesTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export const insertWorkshopInstructorSchema = createInsertSchema(
  workshopInstructorsTable,
).omit({ id: true, assignedAt: true });

export const insertDrillPromptSchema = createInsertSchema(
  drillPromptsTable,
).omit({ id: true, createdAt: true });

export const insertAssignmentExtensionSchema = createInsertSchema(
  assignmentExtensionsTable,
).omit({ id: true, createdAt: true });

export const insertAssignmentMediaUploadSchema = createInsertSchema(
  assignmentMediaUploadsTable,
).omit({ id: true, createdAt: true, claimedAssignmentId: true, consumedAt: true });

export type UserRole = typeof userRolesTable.$inferSelect;
export type InstructorProfile = typeof instructorProfilesTable.$inferSelect;
export type WorkshopInstructor = typeof workshopInstructorsTable.$inferSelect;
export type DrillPrompt = typeof drillPromptsTable.$inferSelect;
export type AssignmentExtension = typeof assignmentExtensionsTable.$inferSelect;
export type AssignmentMediaUpload =
  typeof assignmentMediaUploadsTable.$inferSelect;

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type InsertInstructorProfile = z.infer<
  typeof insertInstructorProfileSchema
>;
export type InsertWorkshopInstructor = z.infer<
  typeof insertWorkshopInstructorSchema
>;
export type InsertDrillPrompt = z.infer<typeof insertDrillPromptSchema>;
export type InsertAssignmentExtension = z.infer<
  typeof insertAssignmentExtensionSchema
>;
export type InsertAssignmentMediaUpload = z.infer<
  typeof insertAssignmentMediaUploadSchema
>;

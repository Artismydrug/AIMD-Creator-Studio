import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export type ChallengeCaptureMetadata = {
  evidenceLevel: "self_attested";
  devicePlatform: "ios" | "android";
  cameraFacing?: "front" | "back";
  deviceMake?: string;
  deviceModel?: string;
  software?: string;
};

export const challengeMediaUploadsTable = pgTable(
  "challenge_media_uploads",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    objectPath: text("object_path").notNull(),
    purpose: text("purpose").notNull(),
    mediaType: text("media_type").notNull(),
    contentType: text("content_type").notNull(),
    sha256: text("sha256").notNull(),
    captureSource: text("capture_source").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    exifTimestamp: timestamp("exif_timestamp", { withTimezone: true }),
    captureMetadata: jsonb("capture_metadata")
      .$type<ChallengeCaptureMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("challenge_media_uploads_object_path_unique").on(table.objectPath),
  ],
);

export const challengeSubmissionsTable = pgTable(
  "challenge_submissions",
  {
    id: serial("id").primaryKey(),
    challengeWeek: text("challenge_week").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    caption: text("caption").notNull(),
    imageUrl: text("image_url"),
    finalMediaUploadId: integer("final_media_upload_id").references(
      () => challengeMediaUploadsTable.id,
      { onDelete: "restrict" },
    ),
    processMediaUploadId: integer("process_media_upload_id").references(
      () => challengeMediaUploadsTable.id,
      { onDelete: "set null" },
    ),
    verificationStatus: text("verification_status")
      .notNull()
      .default("pending_review"),
    verificationReviewedAt: timestamp("verification_reviewed_at", {
      withTimezone: true,
    }),
    verificationReviewerId: integer("verification_reviewer_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_challenge_submission_user_week").on(
      table.challengeWeek,
      table.userId,
    ),
  ],
);

export const challengeVotesTable = pgTable(
  "challenge_votes",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => challengeSubmissionsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_challenge_vote_user_submission").on(
      table.submissionId,
      table.userId,
    ),
  ],
);

export type ChallengeMediaUpload =
  typeof challengeMediaUploadsTable.$inferSelect;
export type ChallengeSubmission =
  typeof challengeSubmissionsTable.$inferSelect;
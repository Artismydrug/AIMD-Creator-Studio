import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studioPostsTable = pgTable("studio_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url"),
  // imageUrl is the legacy media URL for image, video, and audio attachments.
  mediaType: text("media_type").$type<"image" | "video" | "audio">().notNull().default("image"),
  caption: text("caption").notNull(),
  tags: text("tags").array().notNull().default([]),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => studioPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studioPostMediaUploadsTable = pgTable("studio_post_media_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull().unique(),
  mediaType: text("media_type").$type<"video" | "audio">().notNull(),
  measuredDurationSeconds: integer("measured_duration_seconds").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  postId: integer("post_id").unique().references(() => studioPostsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const insertStudioPostSchema = createInsertSchema(studioPostsTable).omit({ id: true, createdAt: true, likes: true });
export type InsertStudioPost = z.infer<typeof insertStudioPostSchema>;
export type StudioPost = typeof studioPostsTable.$inferSelect;

import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studioPostsTable = pgTable("studio_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url"),
  // 'image' | 'video' — how to render imageUrl (uploaded object paths carry no extension)
  mediaType: text("media_type").notNull().default("image"),
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

export const insertStudioPostSchema = createInsertSchema(studioPostsTable).omit({ id: true, createdAt: true, likes: true });
export type InsertStudioPost = z.infer<typeof insertStudioPostSchema>;
export type StudioPost = typeof studioPostsTable.$inferSelect;

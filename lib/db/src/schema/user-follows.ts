import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * A directed creator relationship: follower → following.
 *
 * The unique pair makes follow requests idempotent, while the database check
 * protects against self-follows even if a caller bypasses route validation.
 */
export const userFollowsTable = pgTable("user_follows", {
  followerId: integer("follower_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  followingId: integer("following_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("user_follows_follower_following_unique").on(t.followerId, t.followingId),
  index("user_follows_following_idx").on(t.followingId),
  check("user_follows_no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
]);
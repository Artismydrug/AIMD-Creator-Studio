import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  db,
  habitsTable,
  habitLogsTable,
  studioPostsTable,
  enrollmentsTable,
  badgesTable,
  skillTracksTable,
  usersTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetActivityFeedQueryParams,
  GetActivityFeedResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const today = new Date().toISOString().slice(0, 10);
  // One database round trip and one consistent snapshot. Multiple practice
  // sessions for the same habit/day count as one completed habit, not >100%.
  const { rows } = await db.execute<{
    totalHabits: number; currentStreakDays: number; longestStreakDays: number;
    totalPostsThisMonth: number; workshopsEnrolled: number; badgesEarned: number;
    skillTracksActive: number; completedHabits: number; studioReadyStatus: boolean;
  }>(sql`
    WITH habit_stats AS (
      SELECT count(*)::int AS "totalHabits",
        coalesce(max(current_streak), 0)::int AS "currentStreakDays",
        coalesce(max(longest_streak), 0)::int AS "longestStreakDays"
      FROM ${habitsTable} WHERE user_id = ${userId}
    )
    SELECT habit_stats.*,
      (SELECT count(*)::int FROM ${studioPostsTable} WHERE user_id = ${userId}
        AND created_at >= ${monthStart.toISOString()}) AS "totalPostsThisMonth",
      (SELECT count(*)::int FROM ${enrollmentsTable} WHERE user_id = ${userId}) AS "workshopsEnrolled",
      (SELECT count(*)::int FROM ${badgesTable} WHERE user_id = ${userId}) AS "badgesEarned",
      (SELECT count(*)::int FROM ${skillTracksTable} WHERE user_id = ${userId}
        AND status = 'in_progress') AS "skillTracksActive",
      (SELECT count(DISTINCT habit_id)::int FROM ${habitLogsTable} WHERE user_id = ${userId}
        AND date = ${today} AND completed = true) AS "completedHabits",
      coalesce((SELECT studio_ready_badge FROM ${usersTable} WHERE id = ${userId}), false) AS "studioReadyStatus"
    FROM habit_stats
  `);
  const { completedHabits, ...summary } = rows[0];
  res.json(
    GetDashboardSummaryResponse.parse({
      ...summary,
      completionRate: summary.totalHabits > 0 ? (completedHabits / summary.totalHabits) * 100 : 0,
    })
  );
});

router.get("/dashboard/activity-feed", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const parsed = GetActivityFeedQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;

  const items: Array<{
    id: number;
    type: "habit_log" | "studio_post" | "badge_earned" | "module_complete" | "enrollment";
    description: string;
    imageUrl: string | null;
    createdAt: Date;
  }> = [];

  // habit logs
  const logs = await db
    .select({
      id: habitLogsTable.id,
      minutesSpent: habitLogsTable.minutesSpent,
      createdAt: habitLogsTable.createdAt,
      habitName: habitsTable.name,
    })
    .from(habitLogsTable)
    .leftJoin(habitsTable, and(eq(habitsTable.id, habitLogsTable.habitId), eq(habitsTable.userId, userId)))
    .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.completed, true)))
    .orderBy(desc(habitLogsTable.createdAt))
    .limit(10);

  for (const log of logs) {
    items.push({
      id: log.id,
      type: "habit_log",
      description: `Completed "${log.habitName ?? "habit"}" — ${log.minutesSpent} minutes`,
      imageUrl: null,
      createdAt: log.createdAt,
    });
  }

  // studio posts
  const posts = await db
    .select()
    .from(studioPostsTable)
    .where(eq(studioPostsTable.userId, userId))
    .orderBy(desc(studioPostsTable.createdAt))
    .limit(10);

  for (const post of posts) {
    items.push({
      id: post.id + 10000,
      type: "studio_post",
      description: `Posted to Studio Log: "${post.caption.slice(0, 60)}${post.caption.length > 60 ? "..." : ""}"`,
      imageUrl: post.mediaType === 'audio' ? null : post.imageUrl,
      createdAt: post.createdAt,
    });
  }

  // badges
  const badges = await db
    .select()
    .from(badgesTable)
    .where(eq(badgesTable.userId, userId))
    .orderBy(desc(badgesTable.earnedAt))
    .limit(5);

  for (const badge of badges) {
    items.push({
      id: badge.id + 20000,
      type: "badge_earned",
      description: `Earned badge: "${badge.name}"`,
      imageUrl: badge.imageUrl,
      createdAt: badge.earnedAt,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const sliced = items.slice(0, limit);

  res.json(GetActivityFeedResponse.parse(sliced));
});

export default router;

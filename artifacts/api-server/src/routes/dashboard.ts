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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const habits = await db.select().from(habitsTable).where(eq(habitsTable.userId, userId));
  const totalHabits = habits.length;

  const currentStreakDays = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const longestStreakDays = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [postCountRow] = await db
    .select({ cnt: sql<number>`count(*)`.mapWith(Number) })
    .from(studioPostsTable)
    .where(
      and(
        eq(studioPostsTable.userId, userId),
        gte(studioPostsTable.createdAt, monthStart)
      )
    );
  const totalPostsThisMonth = postCountRow?.cnt ?? 0;

  const [enrollCountRow] = await db
    .select({ cnt: sql<number>`count(*)`.mapWith(Number) })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, userId));
  const workshopsEnrolled = enrollCountRow?.cnt ?? 0;

  const [badgeCountRow] = await db
    .select({ cnt: sql<number>`count(*)`.mapWith(Number) })
    .from(badgesTable)
    .where(eq(badgesTable.userId, userId));
  const badgesEarned = badgeCountRow?.cnt ?? 0;

  const [skillCountRow] = await db
    .select({ cnt: sql<number>`count(*)`.mapWith(Number) })
    .from(skillTracksTable)
    .where(and(eq(skillTracksTable.userId, userId), eq(skillTracksTable.status, "in_progress")));
  const skillTracksActive = skillCountRow?.cnt ?? 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, today), eq(habitLogsTable.completed, true)));
  const completionRate = totalHabits > 0 ? (todayLogs.length / totalHabits) * 100 : 0;

  res.json(
    GetDashboardSummaryResponse.parse({
      totalHabits,
      currentStreakDays,
      longestStreakDays,
      totalPostsThisMonth,
      workshopsEnrolled,
      badgesEarned,
      completionRate,
      skillTracksActive,
      studioReadyStatus: user?.studioReadyBadge ?? false,
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
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.completed, true)))
    .orderBy(desc(habitLogsTable.createdAt))
    .limit(10);

  for (const log of logs) {
    const [habit] = await db.select().from(habitsTable).where(eq(habitsTable.id, log.habitId));
    items.push({
      id: log.id,
      type: "habit_log",
      description: `Completed "${habit?.name ?? "habit"}" — ${log.minutesSpent} minutes`,
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
      imageUrl: post.imageUrl,
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

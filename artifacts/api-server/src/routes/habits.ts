import { Router, type IRouter } from "express";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db, habitsTable, habitLogsTable, usersTable } from "@workspace/db";
import {
  ListHabitsResponse,
  CreateHabitBody,
  CreateHabitResponse,
  GetHabitHeatmapResponse,
  GetHabitParams,
  GetHabitResponse,
  UpdateHabitParams,
  UpdateHabitBody,
  UpdateHabitResponse,
  DeleteHabitParams,
  LogHabitSessionParams,
  LogHabitSessionBody,
  LogHabitSessionResponse,
  ListHabitLogsQueryParams,
  ListHabitLogsResponse,
} from "@workspace/api-zod";
import { FREE_HABIT_LIMIT } from "../middleware/requireTier";

const router: IRouter = Router();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function updateStreak(habitId: number, userId: number): Promise<void> {
  const logs = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, habitId), eq(habitLogsTable.completed, true)))
    .orderBy(desc(habitLogsTable.date));

  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (const log of logs) {
    const logDate = new Date(log.date + "T00:00:00");
    const diff = Math.round((checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) {
      streak++;
      checkDate = logDate;
    } else {
      break;
    }
  }

  const [habit] = await db.select().from(habitsTable).where(eq(habitsTable.id, habitId));
  const longestStreak = Math.max(habit?.longestStreak ?? 0, streak);
  await db
    .update(habitsTable)
    .set({ currentStreak: streak, longestStreak })
    .where(eq(habitsTable.id, habitId));
}

router.get("/habits", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const habits = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId))
    .orderBy(desc(habitsTable.createdAt));

  const today = todayStr();
  const todayLogs = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, today)));

  const completedToday = new Set(todayLogs.filter((l) => l.completed).map((l) => l.habitId));
  const result = habits.map((h) => ({ ...h, completedToday: completedToday.has(h.id) }));

  // Attach tier and limit metadata for the frontend
  const [user] = await db.select({ tier: usersTable.tier }).from(usersTable).where(eq(usersTable.id, userId));
  const tier = user?.tier ?? "free";
  const limitedTier = tier === "free";

  res.json(ListHabitsResponse.parse({
    habits: result,
    meta: {
      tier,
      habitCount:  habits.length,
      habitLimit:  limitedTier ? FREE_HABIT_LIMIT : null,
      atLimit:     limitedTier && habits.length >= FREE_HABIT_LIMIT,
    },
  }));
});

router.post("/habits", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  // Enforce free tier habit limit
  const [user] = await db.select({ tier: usersTable.tier }).from(usersTable).where(eq(usersTable.id, userId));
  if (user?.tier === "free") {
    const countResult = await db.execute(sql`SELECT count(*)::int AS cnt FROM habits WHERE user_id = ${userId}`);
    const habitCount = (countResult.rows[0] as any)?.cnt ?? 0;
    if (habitCount >= FREE_HABIT_LIMIT) {
      res.status(403).json({
        error: "habit_limit",
        limit: FREE_HABIT_LIMIT,
        message: `Free tier is limited to ${FREE_HABIT_LIMIT} habits. Upgrade to Academy Pass for unlimited tracking.`,
      });
      return;
    }
  }

  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [habit] = await db
    .insert(habitsTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(CreateHabitResponse.parse({ ...habit, completedToday: false }));
});

router.get("/habits/heatmap", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoStr = yearAgo.toISOString().slice(0, 10);

  const logs = await db
    .select({
      date:  habitLogsTable.date,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(habitLogsTable)
    .where(
      and(
        eq(habitLogsTable.userId, userId),
        eq(habitLogsTable.completed, true),
        gte(habitLogsTable.date, yearAgoStr)
      )
    )
    .groupBy(habitLogsTable.date);

  const heatmap = logs.map((l) => {
    const c = l.count;
    const level = c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c <= 4 ? 3 : 4;
    return { date: l.date, count: c, level };
  });

  res.json(GetHabitHeatmapResponse.parse(heatmap));
});

router.get("/habits/:id", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = GetHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [habit] = await db
    .select()
    .from(habitsTable)
    .where(and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, userId)));
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  const today = todayStr();
  const [todayLog] = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, habit.id), eq(habitLogsTable.date, today), eq(habitLogsTable.completed, true)));
  res.json(GetHabitResponse.parse({ ...habit, completedToday: !!todayLog }));
});

router.patch("/habits/:id", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = UpdateHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [habit] = await db
    .update(habitsTable)
    .set(parsed.data)
    .where(and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, userId)))
    .returning();
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  res.json(UpdateHabitResponse.parse({ ...habit, completedToday: false }));
});

router.delete("/habits/:id", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [habit] = await db
    .delete(habitsTable)
    .where(and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, userId)))
    .returning();
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  res.sendStatus(204);
});

router.post("/habits/:id/log", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = LogHabitSessionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = LogHabitSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [habit] = await db
    .select()
    .from(habitsTable)
    .where(and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, userId)));
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }

  const logDate: string = (parsed.data.date as string | undefined) ?? todayStr();
  const completed = parsed.data.minutesSpent >= habit.targetMinutes;

  const [log] = await db
    .insert(habitLogsTable)
    .values({ habitId: habit.id, userId, date: logDate, minutesSpent: parsed.data.minutesSpent, completed })
    .returning();

  await updateStreak(habit.id, userId);
  res.status(201).json(LogHabitSessionResponse.parse(log));
});

router.get("/habit-logs", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const parsed = ListHabitLogsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const days   = parsed.data.days ?? 30;
  const habitId = parsed.data.habitId;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const logs = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, habitId), eq(habitLogsTable.userId, userId), gte(habitLogsTable.date, cutoffStr)))
    .orderBy(desc(habitLogsTable.date));

  res.json(ListHabitLogsResponse.parse(logs));
});

export default router;

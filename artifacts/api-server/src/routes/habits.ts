import { Router, type IRouter } from "express";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db, habitsTable, habitLogsTable, usersTable } from "@workspace/db";
import { currentHabitStreak } from "../lib/habitStreak";
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
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "../lib/objectAcl";
import { awardPracticeMilestones, readPracticeMilestones } from "../lib/practiceRewards";
import { GetPracticeMilestonesResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

async function isOwnedHabitProof(
  userId: number,
  proofUrl: string,
  proofMediaType: "image" | "video",
): Promise<boolean> {
  if (!proofUrl.startsWith("/api/storage/objects/")) return false;
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(
      proofUrl.slice("/api/storage".length),
    );
    const canWrite = await objectStorageService.canAccessObjectEntity({
      userId: String(userId),
      objectFile,
      requestedPermission: ObjectPermission.WRITE,
    });
    const policy = await getObjectAclPolicy(objectFile);
    const [metadata] = await objectFile.getMetadata();
    const contentType = String(metadata.contentType ?? "");
    const matchesType = proofMediaType === "image"
      ? contentType.startsWith("image/")
      : contentType.startsWith("video/");
    return canWrite && policy?.owner === String(userId) && policy.visibility === "private" && matchesType;
  } catch (error) {
    if (!(error instanceof ObjectNotFoundError)) {
      // Keep storage validation failures private while rejecting the request.
    }
    return false;
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function updateStreak(
  habitId: number, userId: number,
  database: Pick<typeof db, "selectDistinct" | "update"> = db,
): Promise<void> {
  const logs = await database
    .selectDistinct({ date: habitLogsTable.date })
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, habitId), eq(habitLogsTable.userId, userId), eq(habitLogsTable.completed, true)))
    .orderBy(desc(habitLogsTable.date));

  const streak = currentHabitStreak(logs.map((log) => log.date), todayStr());
  await database
    .update(habitsTable)
    .set({ currentStreak: streak, longestStreak: sql`greatest(${habitsTable.longestStreak}, ${streak})` })
    .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)));
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

  res.json(ListHabitsResponse.parse({
    habits: result,
    meta: {
      tier: req.dbUser.tier,
      habitCount:  habits.length,
    },
  }));
});

router.post("/habits", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

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

router.get("/habits/milestones", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const progress = await readPracticeMilestones(db, req.dbUser.id);
  res.json(GetPracticeMilestonesResponse.parse(progress));
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

  const logDate = parsed.data.date?.toISOString().slice(0, 10) ?? todayStr();
  const ownsProof = await isOwnedHabitProof(userId, parsed.data.proofUrl, parsed.data.proofMediaType);
  if (!ownsProof) {
    res.status(400).json({ error: "Habit proof must be your uploaded image or video." });
    return;
  }
  const log = await db.transaction(async (tx) => {
    // Lock parent before child to remain compatible with account deletion.
    const [owner] = await tx.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, userId)).for("update");
    if (!owner) return null;
    const [lockedHabit] = await tx.select().from(habitsTable)
      .where(and(eq(habitsTable.id, habit.id), eq(habitsTable.userId, userId))).for("update");
    if (!lockedHabit) return null;
    const [saved] = await tx.insert(habitLogsTable).values({
      habitId: habit.id,
      userId,
      date: logDate,
      minutesSpent: parsed.data.minutesSpent,
      completed: parsed.data.minutesSpent >= lockedHabit.targetMinutes,
      proofUrl: parsed.data.proofUrl,
      proofMediaType: parsed.data.proofMediaType,
    })
    .returning();
    await updateStreak(habit.id, userId, tx);
    await awardPracticeMilestones(tx, userId);
    return saved;
  });
  if (!log) { res.status(404).json({ error: "Habit not found" }); return; }
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

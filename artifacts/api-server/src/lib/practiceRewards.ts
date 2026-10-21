import { and, eq, sql } from "drizzle-orm";
import { db, habitLogsTable, pointAwardsTable, usersTable } from "@workspace/db";
import { practiceDay, practiceMilestones, shiftDay } from "./practiceMilestones";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reader = Pick<typeof db, "select" | "selectDistinct">;

export async function readPracticeMilestones(database: Reader, userId: number, now = new Date()) {
  // Count real server-recorded check-in days, not client-supplied/backdated dates.
  // Deleting a habit removes its history; awarded points intentionally remain.
  const dates = await database.selectDistinct({
    date: sql<string>`to_char(${habitLogsTable.createdAt} AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD')`,
  }).from(habitLogsTable).where(and(
    eq(habitLogsTable.userId, userId), eq(habitLogsTable.completed, true),
  ));
  const earned = await database.select({ reason: pointAwardsTable.reason }).from(pointAwardsTable)
    .where(eq(pointAwardsTable.userId, userId));
  // Earned weeks survive habit deletion, preventing regrouping the same weeks
  // into overlapping four-week awards.
  const earnedWeeks = earned.flatMap(({ reason }) => {
    if (/^Habit practice week:\d{4}-\d{2}-\d{2}$/.test(reason)) {
      return [reason.slice("Habit practice week:".length)];
    }
    if (/^Habit practice month:\d{4}-\d{2}-\d{2}$/.test(reason)) {
      const start = reason.slice("Habit practice month:".length);
      return [0, 7, 14, 21].map(offset => shiftDay(start, offset));
    }
    return [];
  });
  return practiceMilestones(dates.map(row => row.date), practiceDay(now), earnedWeeks);
}

/** Caller holds the user's FOR UPDATE lock for the entire log + award transaction. */
export async function awardPracticeMilestones(tx: Transaction, userId: number, now = new Date()) {
  const progress = await readPracticeMilestones(tx, userId, now);
  const awards = await tx.select({ reason: pointAwardsTable.reason }).from(pointAwardsTable)
    .where(eq(pointAwardsTable.userId, userId));
  const existing = new Set(awards.map(row => row.reason));
  for (const [reason, amount] of [
    [progress.weeklyReason, progress.weeklyBonus],
    [progress.monthlyReason, progress.monthlyBonus],
  ] as const) {
    if (!reason || existing.has(reason)) continue;
    await tx.insert(pointAwardsTable).values({ userId, amount, reason });
    await tx.update(usersTable).set({ points: sql`${usersTable.points} + ${amount}` })
      .where(eq(usersTable.id, userId));
  }
}

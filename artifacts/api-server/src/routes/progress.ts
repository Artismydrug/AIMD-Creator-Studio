/**
 * Creator Progress routes
 *
 * GET  /progress            — progress summary (pure read — no DB mutations)
 * POST /progress/check-in   — daily check-in (idempotent per local calendar date)
 * POST /rewards/spin        — daily reward spin (idempotent per local calendar date)
 *
 * Timezone rule (items 1 & 2):
 *   The saved users.timezone is authoritative once established.  For GET the
 *   effective timezone is resolved from (saved → supplied → UTC) with no write.
 *   For POST operations the transaction opens with SELECT … FOR UPDATE to lock
 *   the user row, reads the saved timezone from that snapshot, then applies
 *   resolveEffectiveTimezone() — which returns the saved value if valid and only
 *   falls through to the supplied value when the saved column is absent/invalid.
 *   localDate is computed only after the effective timezone is known.
 *   If shouldPersist is true (first-ever establishment) the timezone is written
 *   in the same transaction, so two racing first-ever requests with different
 *   timezones each INSERT into creator_daily_checkins with the timezone that was
 *   authoritative for their transaction window; the one that commits second sees
 *   DO NOTHING on the checkin INSERT and discards its candidate outcome.
 */

import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  pool,
  usersTable,
  badgesTable,
  habitsTable,
  habitLogsTable,
  creatorDailyCheckinsTable,
  creatorRewardSpinsTable,
} from "@workspace/db";
import {
  GetProgressQueryParams,
  GetProgressResponse,
  CheckInProgressBody,
  CheckInProgressResponse,
  SpinDailyRewardBody,
  SpinDailyRewardResponse,
} from "@workspace/api-zod";
import {
  getLocalDate,
  isValidIanaTimezone,
  resolveEffectiveTimezone,
  computeStreaks,
  computePhaseProgress,
  spinRewardWheel,
  getBadgeMilestonesForStreak,
  getNextBadgeMilestone,
  STREAK_BADGE_MILESTONES,
} from "../lib/progressLogic";

const router: IRouter = Router();

const CHECK_IN_POINTS = 10;

// ── Shared read helper ────────────────────────────────────────────────────────

/**
 * Build a full ProgressSummary payload for a given user.
 * Pure read — zero DB writes.
 *
 * Item 3: counts DISTINCT habit_id values in today's completed logs so that
 * multiple log rows for the same habit cannot inflate the count beyond
 * totalHabits.
 */
async function buildProgressSummary(userId: number, timezone: string) {
  const now = new Date();
  const localDate = getLocalDate(now, timezone);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) throw new Error("User not found");

  const points = user.points;

  // All check-in local dates (ascending) — needed for streak and today check.
  const checkinRows = await db
    .select({ localDate: creatorDailyCheckinsTable.localDate })
    .from(creatorDailyCheckinsTable)
    .where(eq(creatorDailyCheckinsTable.userId, userId))
    .orderBy(creatorDailyCheckinsTable.localDate);

  const sortedDates = checkinRows.map((r) => r.localDate);
  const { currentStreak, longestStreak } = computeStreaks(sortedDates, localDate);
  const todayCheckin = sortedDates.includes(localDate);

  // Total habits for this user.
  const [habitCountRow] = await db
    .select({ cnt: sql<number>`count(*)`.mapWith(Number) })
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId));
  const totalHabits = habitCountRow?.cnt ?? 0;

  // Count DISTINCT completed habit IDs for today to avoid inflation from
  // multiple log entries per habit.
  const [completedRow] = await db
    .select({ cnt: sql<number>`count(distinct ${habitLogsTable.habitId})`.mapWith(Number) })
    .from(habitLogsTable)
    .where(
      and(
        eq(habitLogsTable.userId, userId),
        eq(habitLogsTable.date, localDate),
        eq(habitLogsTable.completed, true),
      ),
    );
  const todayHabitsCompleted = Math.min(
    completedRow?.cnt ?? 0,
    totalHabits,
  );

  // Recent streak badges (up to 5, most recent first).
  const streakBadgeNames = new Set(STREAK_BADGE_MILESTONES.map((m) => m.name));
  const allBadges = await db
    .select()
    .from(badgesTable)
    .where(eq(badgesTable.userId, userId))
    .orderBy(desc(badgesTable.earnedAt));

  const recentBadges = allBadges
    .filter((b) => streakBadgeNames.has(b.name))
    .slice(0, 5);

  // Next unearned badge milestone.
  const earnedStreakDays = allBadges
    .filter((b) => streakBadgeNames.has(b.name))
    .map((b) => STREAK_BADGE_MILESTONES.find((m) => m.name === b.name)?.days ?? 0)
    .filter(Boolean);

  const nextMilestone = getNextBadgeMilestone(currentStreak, earnedStreakDays);
  const nextBadge = nextMilestone
    ? {
        name: nextMilestone.name,
        requiredStreak: nextMilestone.days,
        currentStreak,
        progressPercent: Math.min(100, (currentStreak / nextMilestone.days) * 100),
      }
    : null;

  // Today's spin.
  const [spinRow] = await db
    .select()
    .from(creatorRewardSpinsTable)
    .where(
      and(
        eq(creatorRewardSpinsTable.userId, userId),
        eq(creatorRewardSpinsTable.localDate, localDate),
      ),
    );

  const todaySpin = spinRow
    ? {
        pointsAwarded: spinRow.pointsAwarded,
        localDate: spinRow.localDate,
        alreadySpun: true,
        newBalance: points,
      }
    : null;

  return GetProgressResponse.parse({
    points,
    phase: computePhaseProgress(points),
    currentStreak,
    longestStreak,
    todayHabitsCompleted,
    totalHabits,
    recentBadges: recentBadges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      imageUrl: b.imageUrl ?? null,
      earnedAt: b.earnedAt,
    })),
    nextBadge,
    timezone: user.timezone ?? timezone,
    localDate,
    checkedInToday: todayCheckin,
    spinAvailableToday: !spinRow,
    todaySpin,
  });
}

// ── GET /progress — pure read, zero writes ────────────────────────────────────

router.get("/progress", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = GetProgressQueryParams.safeParse(req.query);
  const suppliedTz = parsed.success ? parsed.data.timezone : undefined;

  // Saved timezone is authoritative; supplied only matters when no saved value.
  // No write here — GET must stay pure.
  const { timezone } = resolveEffectiveTimezone(req.dbUser.timezone, suppliedTz);

  try {
    const summary = await buildProgressSummary(req.dbUser.id, timezone);
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "getProgress error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /progress/check-in ───────────────────────────────────────────────────

router.post("/progress/check-in", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CheckInProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { timezone: suppliedTz } = parsed.data;
  if (!isValidIanaTimezone(suppliedTz)) {
    res.status(400).json({ error: `Invalid IANA timezone: ${suppliedTz}` });
    return;
  }

  const userId = req.dbUser.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the user row so two racing first-ever requests serialize here.
    // Read the current saved timezone from this snapshot.
    const { rows: userRows } = await client.query<{
      timezone: string | null;
      points: number;
    }>(
      `SELECT timezone, points FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );

    if (userRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Saved timezone is authoritative; supplied establishes it only when absent.
    const { timezone, shouldPersist } = resolveEffectiveTimezone(
      userRows[0].timezone,
      suppliedTz,
    );

    // Compute localDate only after the effective timezone is determined.
    const localDate = getLocalDate(new Date(), timezone);

    if (shouldPersist) {
      await client.query(
        `UPDATE users SET timezone = $2 WHERE id = $1`,
        [userId, timezone],
      );
    }

    // Fetch existing check-in dates inside the transaction (same snapshot).
    const { rows: streakRows } = await client.query<{ local_date: string }>(
      `SELECT local_date FROM creator_daily_checkins WHERE user_id = $1 ORDER BY local_date ASC`,
      [userId],
    );

    // Idempotent insert — RETURNING id is non-empty only when the row was
    // actually written (not a duplicate).
    const { rows: inserted } = await client.query<{ id: number }>(
      `INSERT INTO creator_daily_checkins (user_id, local_date, timezone, streak_day)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, local_date) DO NOTHING
       RETURNING id`,
      [userId, localDate, timezone, 1],
    );

    if (inserted.length > 0) {
      // Compute the real streak now that today's date is part of the set.
      const sortedDates = streakRows.map((r) => r.local_date);
      sortedDates.push(localDate);
      sortedDates.sort();
      const { currentStreak } = computeStreaks(sortedDates, localDate);

      // Back-fill the real streak_day.
      await client.query(
        `UPDATE creator_daily_checkins SET streak_day = $1 WHERE id = $2`,
        [currentStreak, inserted[0].id],
      );

      // Award check-in points.
      await client.query(
        `INSERT INTO point_awards (user_id, amount, reason, awarded_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, CHECK_IN_POINTS, `Daily check-in ${localDate}`, userId],
      );
      await client.query(
        `UPDATE users SET points = points + $2 WHERE id = $1`,
        [userId, CHECK_IN_POINTS],
      );

      // Award streak milestone badges — WHERE NOT EXISTS prevents duplicates.
      for (const milestone of getBadgeMilestonesForStreak(currentStreak)) {
        await client.query(
          `INSERT INTO badges (user_id, name, description)
           SELECT $1, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM badges WHERE user_id = $1 AND name = $2
           )`,
          [userId, milestone.name, milestone.description],
        );
      }

      req.log.info({ userId, localDate, streak: currentStreak }, "daily check-in recorded");
    } else {
      req.log.info({ userId, localDate }, "daily check-in already recorded today");
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    req.log.error({ err }, "check-in transaction failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  } finally {
    client.release();
  }

  // Re-fetch with a clean Drizzle query so the summary sees the committed state,
  // including any just-written timezone.
  const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const effectiveTz = resolveEffectiveTimezone(freshUser?.timezone, suppliedTz).timezone;

  try {
    const summary = await buildProgressSummary(userId, effectiveTz);
    res.json(CheckInProgressResponse.parse(summary));
  } catch (err) {
    req.log.error({ err }, "buildProgressSummary after check-in failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /rewards/spin ────────────────────────────────────────────────────────

router.post("/rewards/spin", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SpinDailyRewardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { timezone: suppliedTz } = parsed.data;
  if (!isValidIanaTimezone(suppliedTz)) {
    res.status(400).json({ error: `Invalid IANA timezone: ${suppliedTz}` });
    return;
  }

  const userId = req.dbUser.id;
  // Candidate outcome: chosen before the transaction so it is stable for a
  // single attempt. Discarded if the INSERT loses the race.
  const candidatePoints = spinRewardWheel();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the user row — serialises racing first-ever requests.
    const { rows: userRows } = await client.query<{
      timezone: string | null;
      points: number;
    }>(
      `SELECT timezone, points FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );

    if (userRows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Saved timezone is authoritative; supplied establishes it only when absent.
    const { timezone, shouldPersist } = resolveEffectiveTimezone(
      userRows[0].timezone,
      suppliedTz,
    );

    // Compute localDate only after the effective timezone is determined.
    const localDate = getLocalDate(new Date(), timezone);

    if (shouldPersist) {
      await client.query(
        `UPDATE users SET timezone = $2 WHERE id = $1`,
        [userId, timezone],
      );
    }

    // Idempotent insert — non-empty RETURNING only when the row was written.
    const { rows: inserted } = await client.query<{
      id: number;
      points_awarded: number;
    }>(
      `INSERT INTO creator_reward_spins (user_id, local_date, timezone, points_awarded)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, local_date) DO NOTHING
       RETURNING id, points_awarded`,
      [userId, localDate, timezone, candidatePoints],
    );

    let pointsAwarded: number;
    let alreadySpun: boolean;
    let newBalance: number;

    if (inserted.length > 0) {
      // New spin — award points.
      pointsAwarded = inserted[0].points_awarded;
      alreadySpun = false;

      await client.query(
        `INSERT INTO point_awards (user_id, amount, reason, awarded_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, pointsAwarded, `Daily reward spin ${localDate}`, userId],
      );

      const { rows: balRows } = await client.query<{ points: number }>(
        `UPDATE users SET points = points + $2 WHERE id = $1 RETURNING points`,
        [userId, pointsAwarded],
      );

      if (balRows.length === 0) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      newBalance = balRows[0].points;
      req.log.info({ userId, localDate, pointsAwarded, newBalance }, "daily spin completed");
    } else {
      // INSERT lost the race — return the winning transaction's result.
      // No new ledger entry or points increment.
      const { rows: existingRows } = await client.query<{ points_awarded: number }>(
        `SELECT points_awarded FROM creator_reward_spins WHERE user_id = $1 AND local_date = $2`,
        [userId, localDate],
      );
      const { rows: balRows } = await client.query<{ points: number }>(
        `SELECT points FROM users WHERE id = $1`,
        [userId],
      );

      pointsAwarded = existingRows[0]?.points_awarded ?? candidatePoints;
      newBalance = balRows[0]?.points ?? 0;
      alreadySpun = true;

      req.log.info(
        { userId, localDate },
        "daily spin already recorded today — returning existing result",
      );
    }

    await client.query("COMMIT");

    res.json(
      SpinDailyRewardResponse.parse({ pointsAwarded, localDate, alreadySpun, newBalance }),
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    req.log.error({ err }, "spin transaction failed");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;

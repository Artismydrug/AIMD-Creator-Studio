/**
 * Pure helper functions for Creator Progress logic.
 * No live DB connections — safe for unit tests.
 */

// ── Timezone / local-day ──────────────────────────────────────────────────────

/** IANA timezone validation via Intl.DateTimeFormat. */
export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the effective IANA timezone for a creator, enforcing the rule that
 * the **saved** timezone is authoritative once established:
 *
 *   1. If `saved` is a valid IANA timezone → return it unchanged (authoritative).
 *   2. Else if `supplied` is a valid IANA timezone → return it (establishes initial).
 *   3. Otherwise fall back to "UTC".
 *
 * The second return value signals whether the caller should persist `supplied`
 * as the new saved timezone (true only when no valid saved timezone existed).
 *
 * This is a pure function — no DB access.
 */
export function resolveEffectiveTimezone(
  saved: string | null | undefined,
  supplied: string | null | undefined,
): { timezone: string; shouldPersist: boolean } {
  if (saved && isValidIanaTimezone(saved)) {
    return { timezone: saved, shouldPersist: false };
  }
  if (supplied && isValidIanaTimezone(supplied)) {
    return { timezone: supplied, shouldPersist: true };
  }
  return { timezone: "UTC", shouldPersist: false };
}

/**
 * Returns the local calendar date ("YYYY-MM-DD") for a given instant in the
 * specified IANA timezone. Uses Intl.DateTimeFormat — no tzdata install needed.
 */
export function getLocalDate(now: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    // en-CA locale produces ISO-format dates "YYYY-MM-DD"
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

// ── Streak calculation ────────────────────────────────────────────────────────

/**
 * Given a sorted (ascending) array of YYYY-MM-DD local date strings that have
 * been checked in, compute the current streak (consecutive days ending on or
 * including `today`) and the longest ever streak.
 *
 * "Consecutive" means each pair of adjacent dates differs by exactly one
 * calendar day.
 */
export function computeStreaks(
  sortedDates: string[],
  today: string,
): { currentStreak: number; longestStreak: number } {
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Deduplicate just in case
  const unique = Array.from(new Set(sortedDates)).sort();

  let longestStreak = 1;
  let runLen = 1;

  for (let i = 1; i < unique.length; i++) {
    const prev = unique[i - 1];
    const curr = unique[i];
    if (daysDiff(prev, curr) === 1) {
      runLen++;
      if (runLen > longestStreak) longestStreak = runLen;
    } else {
      runLen = 1;
    }
  }

  // Current streak: count backwards from today
  const last = unique[unique.length - 1];

  // If the last check-in is not today or yesterday, streak is 0 (or 1 if today itself)
  const diffFromToday = daysDiff(last, today);
  if (diffFromToday > 1) {
    return { currentStreak: 0, longestStreak };
  }

  let currentStreak = 1;
  for (let i = unique.length - 2; i >= 0; i--) {
    if (daysDiff(unique[i], unique[i + 1]) === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

/** Number of calendar days from dateA to dateB (B - A). */
function daysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z").getTime();
  const b = new Date(dateB + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

// ── Phase calculation ─────────────────────────────────────────────────────────

export type Phase = "Discovering" | "Dedicated" | "Professional";

const PHASES: Array<{ phase: Phase; threshold: number }> = [
  { phase: "Discovering", threshold: 0 },
  { phase: "Dedicated", threshold: 250 },
  { phase: "Professional", threshold: 1000 },
];

export interface PhaseProgressResult {
  phase: Phase;
  currentPoints: number;
  nextPhase: string | null;
  nextPhasePoints: number | null;
  progressPercent: number;
}

export function computePhaseProgress(points: number): PhaseProgressResult {
  let currentPhase = PHASES[0];
  for (const p of PHASES) {
    if (points >= p.threshold) {
      currentPhase = p;
    }
  }

  const currentIdx = PHASES.indexOf(currentPhase);
  const next = PHASES[currentIdx + 1] ?? null;

  let progressPercent: number;
  if (!next) {
    progressPercent = 100;
  } else {
    const range = next.threshold - currentPhase.threshold;
    const earned = points - currentPhase.threshold;
    progressPercent = Math.min(100, (earned / range) * 100);
  }

  return {
    phase: currentPhase.phase,
    currentPoints: points,
    nextPhase: next?.phase ?? null,
    nextPhasePoints: next?.threshold ?? null,
    progressPercent,
  };
}

// ── Badge milestones ──────────────────────────────────────────────────────────

export const STREAK_BADGE_MILESTONES: Array<{
  days: number;
  name: string;
  description: string;
}> = [
  {
    days: 1,
    name: "First Check-In",
    description: "Showed up on day one. The journey begins.",
  },
  {
    days: 3,
    name: "3-Day Streak",
    description: "Three days consistent. Building momentum.",
  },
  {
    days: 7,
    name: "7-Day Streak",
    description: "A full week of daily check-ins. You're committed.",
  },
  {
    days: 14,
    name: "14-Day Streak",
    description: "Two weeks strong. Consistency is your superpower.",
  },
  {
    days: 30,
    name: "30-Day Streak",
    description: "Thirty days. You've made this a habit.",
  },
];

/** Returns the milestone configs that should be awarded for this streak length. */
export function getBadgeMilestonesForStreak(streakDays: number): typeof STREAK_BADGE_MILESTONES {
  return STREAK_BADGE_MILESTONES.filter((m) => m.days === streakDays);
}

/** Returns the next unpassed milestone above the current streak. */
export function getNextBadgeMilestone(
  currentStreak: number,
  earnedStreakDays: number[],
): (typeof STREAK_BADGE_MILESTONES)[0] | null {
  const earned = new Set(earnedStreakDays);
  return (
    STREAK_BADGE_MILESTONES.find(
      (m) => !earned.has(m.days) && m.days > currentStreak,
    ) ?? null
  );
}

// ── Reward spin ───────────────────────────────────────────────────────────────

const SPIN_OUTCOMES: Array<{ points: number; weight: number }> = [
  { points: 5, weight: 50 },   // 50% chance
  { points: 10, weight: 30 },  // 30% chance
  { points: 20, weight: 15 },  // 15% chance
  { points: 50, weight: 5 },   //  5% chance
];

const TOTAL_WEIGHT = SPIN_OUTCOMES.reduce((s, o) => s + o.weight, 0);

/**
 * Randomly select a weighted spin outcome.
 * `rand` defaults to Math.random() — injectable for deterministic tests.
 */
export function spinRewardWheel(rand: number = Math.random()): number {
  const target = rand * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const outcome of SPIN_OUTCOMES) {
    cumulative += outcome.weight;
    if (target < cumulative) {
      return outcome.points;
    }
  }
  // Fallback (floating-point edge case)
  return SPIN_OUTCOMES[SPIN_OUTCOMES.length - 1].points;
}

/** Returns true if the weighted outcome is within expected bounds. */
export function isValidSpinOutcome(points: number): boolean {
  return SPIN_OUTCOMES.some((o) => o.points === points);
}

const DAY = 86_400_000;
export const WEEKLY_PRACTICE_BONUS = 50;
export const MONTHLY_PRACTICE_BONUS = 200;

/** Calendar arithmetic uses UTC on LA date strings, so DST cannot shorten a week. */
export function practiceDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function shiftDay(day: string, count: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * DAY).toISOString().slice(0, 10);
}

export function mondayOf(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return shiftDay(day, -((weekday + 6) % 7));
}

export function practiceMilestones(dates: readonly string[], today: string, earnedWeeks: readonly string[] = []) {
  const currentMonday = mondayOf(today);
  const uniqueDays = [...new Set(dates)].filter(day => day <= today);
  const earned = new Set(earnedWeeks);
  const daysIn = (start: string) => Math.max(
    earned.has(start) ? 5 : 0,
    uniqueDays.filter(day => day >= start && day <= shiftDay(start, 6)).length,
  );
  const currentDays = daysIn(currentMonday);
  // An unfinished current week does not break a streak until that week ends.
  let completedWeeks = currentDays >= 5 ? 1 : 0;
  let previous = shiftDay(currentMonday, -7);
  while (daysIn(previous) >= 5) {
    completedWeeks++;
    previous = shiftDay(previous, -7);
  }
  const inCycle = currentDays >= 5
    ? ((completedWeeks - 1) % 4) + 1
    : completedWeeks % 4;
  const cycleStart = shiftDay(currentMonday, -7 * (currentDays >= 5 ? inCycle - 1 : inCycle));
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const start = shiftDay(cycleStart, index * 7);
    const days = daysIn(start);
    return { start, end: shiftDay(start, 6), days, completed: days >= 5, current: start === currentMonday };
  });
  return {
    cycleStart, cycleEnd: shiftDay(cycleStart, 27), currentWeekStart: currentMonday,
    currentWeekDays: currentDays, completedWeeks: weeks.filter(week => week.completed).length,
    weeks, weeklyBonus: WEEKLY_PRACTICE_BONUS, monthlyBonus: MONTHLY_PRACTICE_BONUS,
    weeklyReason: currentDays >= 5 ? `Habit practice week:${currentMonday}` : null,
    monthlyReason: currentDays >= 5 && completedWeeks % 4 === 0
      ? `Habit practice month:${cycleStart}` : null,
  };
}

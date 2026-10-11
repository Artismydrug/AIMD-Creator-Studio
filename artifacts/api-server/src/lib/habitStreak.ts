/** Habit sessions may repeat; a streak measures distinct UTC calendar days. */
export function currentHabitStreak(dates: readonly string[], today: string): number {
  const days = [...new Set(dates)].filter((day) => day <= today).sort().reverse();
  let expected = Date.parse(`${today}T00:00:00Z`);
  let streak = 0;
  for (const day of days) {
    const timestamp = Date.parse(`${day}T00:00:00Z`);
    const difference = (expected - timestamp) / 86_400_000;
    if (difference !== 0 && difference !== 1) break;
    streak++;
    expected = timestamp;
  }
  return streak;
}

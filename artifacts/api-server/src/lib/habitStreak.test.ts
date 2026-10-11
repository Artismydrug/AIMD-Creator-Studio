import { describe, expect, it } from "vitest";
import { currentHabitStreak } from "./habitStreak";

describe("habit streak calendar days", () => {
  it("counts many sessions on the same day only once", () => {
    expect(currentHabitStreak(Array(20).fill("2026-10-10"), "2026-10-10")).toBe(1);
  });
  it("counts consecutive days even with duplicates/out-of-order logs", () => {
    expect(currentHabitStreak(["2026-10-08", "2026-10-10", "2026-10-09", "2026-10-09"], "2026-10-10")).toBe(3);
  });
  it("retains the existing yesterday grace period and breaks on gaps", () => {
    expect(currentHabitStreak(["2026-10-09", "2026-10-08", "2026-10-06"], "2026-10-10")).toBe(2);
    expect(currentHabitStreak(["2026-10-08"], "2026-10-10")).toBe(0);
  });
  it("does not let a future-dated entry hide today's real progress", () => {
    expect(currentHabitStreak(["2026-10-11", "2026-10-10"], "2026-10-10")).toBe(1);
    expect(currentHabitStreak([], "2026-10-10")).toBe(0);
  });
});

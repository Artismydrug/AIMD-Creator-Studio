/**
 * Unit tests for progressLogic.ts pure helpers.
 * No DB connection required.
 */

import { describe, it, expect } from "vitest";
import {
  getLocalDate,
  isValidIanaTimezone,
  resolveEffectiveTimezone,
  computeStreaks,
  computePhaseProgress,
  spinRewardWheel,
  isValidSpinOutcome,
  getBadgeMilestonesForStreak,
  getNextBadgeMilestone,
} from "./progressLogic";

// ── Timezone helpers ──────────────────────────────────────────────────────────

describe("isValidIanaTimezone", () => {
  it("accepts well-known timezones", () => {
    expect(isValidIanaTimezone("America/New_York")).toBe(true);
    expect(isValidIanaTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTimezone("Europe/London")).toBe(true);
    expect(isValidIanaTimezone("Asia/Tokyo")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
  });

  it("rejects garbage strings", () => {
    expect(isValidIanaTimezone("NotATimezone")).toBe(false);
    expect(isValidIanaTimezone("")).toBe(false);
    expect(isValidIanaTimezone("America/Fake")).toBe(false);
  });
});

describe("getLocalDate", () => {
  it("returns YYYY-MM-DD in the given timezone", () => {
    // UTC midnight on Jan 2 is still Jan 1 in New York (UTC-5)
    const utcMidnight = new Date("2025-01-02T00:00:00Z");
    expect(getLocalDate(utcMidnight, "America/New_York")).toBe("2025-01-01");
    // UTC midnight on Jan 2 is already Jan 2 in Tokyo (UTC+9)
    expect(getLocalDate(utcMidnight, "Asia/Tokyo")).toBe("2025-01-02");
  });

  it("returns the correct day at noon UTC", () => {
    const noon = new Date("2025-06-15T12:00:00Z");
    expect(getLocalDate(noon, "UTC")).toBe("2025-06-15");
    expect(getLocalDate(noon, "America/New_York")).toBe("2025-06-15"); // noon UTC = 8am ET
    expect(getLocalDate(noon, "Pacific/Auckland")).toBe("2025-06-16"); // NZST = UTC+12
  });
});

// ── Effective timezone resolution ────────────────────────────────────────────

describe("resolveEffectiveTimezone", () => {
  it("saved valid timezone wins — supplied is ignored", () => {
    const result = resolveEffectiveTimezone(
      "America/New_York",
      "America/Los_Angeles",
    );
    expect(result.timezone).toBe("America/New_York");
    expect(result.shouldPersist).toBe(false);
  });

  it("supplied establishes timezone when saved is absent (null)", () => {
    const result = resolveEffectiveTimezone(null, "America/Chicago");
    expect(result.timezone).toBe("America/Chicago");
    expect(result.shouldPersist).toBe(true);
  });

  it("supplied establishes timezone when saved is absent (undefined)", () => {
    const result = resolveEffectiveTimezone(undefined, "Europe/Berlin");
    expect(result.timezone).toBe("Europe/Berlin");
    expect(result.shouldPersist).toBe(true);
  });

  it("supplied establishes timezone when saved is an empty string", () => {
    const result = resolveEffectiveTimezone("", "Asia/Tokyo");
    expect(result.timezone).toBe("Asia/Tokyo");
    expect(result.shouldPersist).toBe(true);
  });

  it("saved invalid falls through to valid supplied", () => {
    const result = resolveEffectiveTimezone("NotReal/Zone", "Pacific/Auckland");
    expect(result.timezone).toBe("Pacific/Auckland");
    expect(result.shouldPersist).toBe(true);
  });

  it("both absent falls back to UTC without persist", () => {
    const result = resolveEffectiveTimezone(null, null);
    expect(result.timezone).toBe("UTC");
    expect(result.shouldPersist).toBe(false);
  });

  it("both invalid falls back to UTC without persist", () => {
    const result = resolveEffectiveTimezone("Bad/Zone", "Also/Bad");
    expect(result.timezone).toBe("UTC");
    expect(result.shouldPersist).toBe(false);
  });

  it("saved valid beats invalid supplied — no persist", () => {
    const result = resolveEffectiveTimezone("America/Denver", "Not/Valid");
    expect(result.timezone).toBe("America/Denver");
    expect(result.shouldPersist).toBe(false);
  });
});

// ── Streak calculation ────────────────────────────────────────────────────────

describe("computeStreaks", () => {
  it("returns zero streaks for empty input", () => {
    expect(computeStreaks([], "2025-01-10")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it("counts a single check-in today as streak 1", () => {
    expect(computeStreaks(["2025-01-10"], "2025-01-10")).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  it("resets current streak when last check-in was more than 1 day ago", () => {
    const result = computeStreaks(
      ["2025-01-01", "2025-01-02", "2025-01-05"],
      "2025-01-10",
    );
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2);
  });

  it("counts consecutive days correctly", () => {
    const dates = ["2025-01-06", "2025-01-07", "2025-01-08", "2025-01-09", "2025-01-10"];
    expect(computeStreaks(dates, "2025-01-10")).toEqual({
      currentStreak: 5,
      longestStreak: 5,
    });
  });

  it("identifies the longest streak even if not current", () => {
    const dates = [
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
      "2025-01-04",
      "2025-01-06",
      "2025-01-07",
      "2025-01-08",
    ];
    const result = computeStreaks(dates, "2025-01-08");
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(4);
  });

  it("handles yesterday as last check-in (streak still active)", () => {
    const result = computeStreaks(
      ["2025-01-08", "2025-01-09"],
      "2025-01-10",
    );
    expect(result.currentStreak).toBe(2);
  });
});

// ── Phase projection ──────────────────────────────────────────────────────────

describe("computePhaseProgress", () => {
  it("returns Discovering at 0 points", () => {
    const result = computePhaseProgress(0);
    expect(result.phase).toBe("Discovering");
    expect(result.nextPhase).toBe("Dedicated");
    expect(result.nextPhasePoints).toBe(250);
    expect(result.progressPercent).toBe(0);
  });

  it("returns Dedicated at 250 points", () => {
    const result = computePhaseProgress(250);
    expect(result.phase).toBe("Dedicated");
    expect(result.nextPhase).toBe("Professional");
    expect(result.nextPhasePoints).toBe(1000);
    expect(result.progressPercent).toBeCloseTo(0, 0);
  });

  it("returns Professional at 1000 points", () => {
    const result = computePhaseProgress(1000);
    expect(result.phase).toBe("Professional");
    expect(result.nextPhase).toBeNull();
    expect(result.nextPhasePoints).toBeNull();
    expect(result.progressPercent).toBe(100);
  });

  it("calculates progress percent within a phase", () => {
    // 125 points into Discovering (0..250 range), expect 50%
    expect(computePhaseProgress(125).progressPercent).toBeCloseTo(50, 1);
    // 625 out of 1000 in Dedicated (250..1000 range): (375/750)*100 = 50%
    expect(computePhaseProgress(625).progressPercent).toBeCloseTo(50, 1);
  });

  it("caps percent at 100 when at max phase", () => {
    expect(computePhaseProgress(9999).progressPercent).toBe(100);
  });
});

// ── Weighted spin outcomes ────────────────────────────────────────────────────

describe("spinRewardWheel", () => {
  it("returns only valid point values", () => {
    for (let i = 0; i < 100; i++) {
      const pts = spinRewardWheel(Math.random());
      expect([5, 10, 20, 50]).toContain(pts);
    }
  });

  it("deterministic: rand=0 returns lowest weight outcome (5)", () => {
    expect(spinRewardWheel(0)).toBe(5);
  });

  it("deterministic: rand approaching 1 returns highest outcome (50)", () => {
    expect(spinRewardWheel(0.9999)).toBe(50);
  });

  it("validates all outcome values via isValidSpinOutcome", () => {
    expect(isValidSpinOutcome(5)).toBe(true);
    expect(isValidSpinOutcome(10)).toBe(true);
    expect(isValidSpinOutcome(20)).toBe(true);
    expect(isValidSpinOutcome(50)).toBe(true);
    expect(isValidSpinOutcome(15)).toBe(false);
    expect(isValidSpinOutcome(0)).toBe(false);
  });
});

// ── Badge milestones ──────────────────────────────────────────────────────────

describe("getBadgeMilestonesForStreak", () => {
  it("returns milestone at exactly the threshold", () => {
    expect(getBadgeMilestonesForStreak(7)).toHaveLength(1);
    expect(getBadgeMilestonesForStreak(7)[0].days).toBe(7);
  });

  it("returns empty array for non-milestone days", () => {
    expect(getBadgeMilestonesForStreak(2)).toHaveLength(0);
    expect(getBadgeMilestonesForStreak(100)).toHaveLength(0);
  });
});

describe("getNextBadgeMilestone", () => {
  it("returns first milestone when no badges earned", () => {
    const next = getNextBadgeMilestone(0, []);
    expect(next?.days).toBe(1);
  });

  it("returns next unearned milestone above current streak", () => {
    const next = getNextBadgeMilestone(3, [1, 3]);
    expect(next?.days).toBe(7);
  });

  it("returns null when all milestones earned", () => {
    const next = getNextBadgeMilestone(30, [1, 3, 7, 14, 30]);
    expect(next).toBeNull();
  });
});

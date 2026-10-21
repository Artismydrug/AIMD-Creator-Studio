import { describe, expect, it } from "vitest";
import { mondayOf, practiceDay, practiceMilestones, shiftDay } from "./practiceMilestones";

const week = (start: string, count = 5) => Array.from({ length: count }, (_, i) => shiftDay(start, i));
const month = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"].flatMap(day => week(day));

describe("practice milestones", () => {
  it("uses LA dates and Monday weeks over DST and UTC midnight", () => {
    expect(practiceDay(new Date("2026-10-20T02:00:00Z"))).toBe("2026-10-19");
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
  });
  it("counts distinct days across habits, not sessions", () => {
    const progress = practiceMilestones([...week("2026-10-19", 4), ...week("2026-10-19", 4)], "2026-10-23");
    expect(progress.currentWeekDays).toBe(4);
    expect(progress.weeklyReason).toBeNull();
  });
  it("allows nonconsecutive five-day weeks and ignores future sessions", () => {
    const days = [0, 1, 3, 5, 6, 7].map(offset => shiftDay("2026-10-19", offset));
    const progress = practiceMilestones(days, "2026-10-25");
    expect(progress.currentWeekDays).toBe(5);
    expect(progress.weeklyReason).toBe("Habit practice week:2026-10-19");
  });
  it("requires four qualifying weeks, not 20 scattered days", () => {
    expect(practiceMilestones(month, "2026-10-22").monthlyReason).toBeNull();
    expect(practiceMilestones(month, "2026-10-23").monthlyReason).toBe("Habit practice month:2026-09-28");
    expect(practiceMilestones(month, "2026-10-23").completedWeeks).toBe(4);
  });
  it("starts the next cycle on Monday and keeps completed past weeks", () => {
    const p = practiceMilestones(month, "2026-10-26");
    expect(p.cycleStart).toBe("2026-10-26");
    expect(p.completedWeeks).toBe(0);
  });
  it("does not reset a run during an unfinished week", () => {
    const p = practiceMilestones(month.slice(0, 15), "2026-10-21");
    expect(p.cycleStart).toBe("2026-09-28");
    expect(p.completedWeeks).toBe(3);
  });
  it("resets after a missed week and retains earned weeks after habit deletion", () => {
    expect(practiceMilestones(week("2026-09-28"), "2026-10-19").completedWeeks).toBe(0);
    const p = practiceMilestones(week("2026-10-19"), "2026-10-23", ["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(p.monthlyReason).toBe("Habit practice month:2026-09-28");
  });
  it("has nonoverlapping cycles at eight completed weeks", () => {
    const days = Array.from({ length: 8 }, (_, i) => week(shiftDay("2026-09-28", 7 * i))).flat();
    expect(practiceMilestones(days, "2026-11-20").monthlyReason).toBe("Habit practice month:2026-10-26");
  });
});

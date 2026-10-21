import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { awardPracticeMilestones, readPracticeMilestones } from "./practiceRewards";
import { shiftDay } from "./practiceMilestones";

let userId: number;
let habitId: number;
const now = new Date("2026-10-23T20:00:00Z");
beforeAll(async () => {
  const key = `milestones_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { rows } = await pool.query("INSERT INTO users (email, username) VALUES ($1,$2) RETURNING id", [`${key}@example.test`, key]);
  userId = rows[0].id;
  const habits = await pool.query("INSERT INTO habits (user_id,name,category,target_minutes) VALUES ($1,'Streak fixture','practice',5) RETURNING id", [userId]);
  habitId = habits.rows[0].id;
  for (const monday of ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]) {
    for (let i = 0; i < 5; i++) {
      const day = shiftDay(monday, i);
      await pool.query("INSERT INTO habit_logs (user_id,habit_id,date,completed,minutes_spent,created_at) VALUES ($1,$2,$3,true,5,$4)", [userId, habitId, day, `${day}T20:00:00Z`]);
    }
  }
});
afterAll(async () => {
  if (userId) await pool.query("DELETE FROM users WHERE id=$1", [userId]);
  await pool.end();
});
describe("atomic practice rewards", () => {
  it("serializes concurrent requests and awards only 50 + 200 once", async () => {
    await Promise.all(Array.from({ length: 5 }, () => db.transaction(async tx => {
      await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).for("update");
      await awardPracticeMilestones(tx, userId, now);
    })));
    const { rows } = await pool.query("SELECT points FROM users WHERE id=$1", [userId]);
    expect(rows[0].points).toBe(250);
    const awards = await pool.query("SELECT amount FROM point_awards WHERE user_id=$1 ORDER BY amount", [userId]);
    expect(awards.rows.map(row => row.amount)).toEqual([50, 200]);
  });
  it("retains earned weeks after deleting a habit, without overlapping rewards", async () => {
    await pool.query("DELETE FROM habits WHERE id=$1", [habitId]);
    expect((await readPracticeMilestones(db, userId, now)).completedWeeks).toBe(4);
    await db.transaction(async tx => {
      await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).for("update");
      await awardPracticeMilestones(tx, userId, now);
    });
    expect((await pool.query("SELECT points FROM users WHERE id=$1", [userId])).rows[0].points).toBe(250);
  });
});

import { pgTable, serial, integer, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const habitsTable = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  targetMinutes: integer("target_minutes").notNull().default(30),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const habitLogsTable = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habitsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  minutesSpent: integer("minutes_spent").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true, currentStreak: true, longestStreak: true });
export const insertHabitLogSchema = createInsertSchema(habitLogsTable).omit({ id: true, createdAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type Habit = typeof habitsTable.$inferSelect;
export type HabitLog = typeof habitLogsTable.$inferSelect;

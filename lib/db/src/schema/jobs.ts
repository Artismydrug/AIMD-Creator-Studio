import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobListingsTable = pgTable("job_listings", {
  id: serial("id").primaryKey(),
  studioName: text("studio_name").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // resident | guest | apprenticeship
  location: text("location").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  compensation: text("compensation"),
  isOpen: boolean("is_open").notNull().default(true),
  applicantCount: integer("applicant_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobApplicationsTable = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  jobListingId: integer("job_listing_id").notNull().references(() => jobListingsTable.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("pending"), // pending | reviewing | accepted | rejected
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobListingSchema = createInsertSchema(jobListingsTable).omit({ id: true, createdAt: true, applicantCount: true });
export const insertJobApplicationSchema = createInsertSchema(jobApplicationsTable).omit({ id: true, appliedAt: true, status: true });
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobListing = typeof jobListingsTable.$inferSelect;
export type JobApplication = typeof jobApplicationsTable.$inferSelect;

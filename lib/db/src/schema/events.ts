import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const communityEventsTable = pgTable("community_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().$type<"workshop" | "pop-up" | "gallery" | "activation" | "community">(),
  eventType: text("event_type").notNull().$type<"free" | "ticketed" | "members-only">(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  maxCapacity: integer("max_capacity"),
  rsvpCount: integer("rsvp_count").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventRsvpsTable = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  eventId: integer("event_id").references(() => communityEventsTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

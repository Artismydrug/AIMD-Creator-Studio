import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tattooBookingsTable = pgTable(
  "tattoo_bookings",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    idea: text("idea").notNull(),
    placement: text("placement").notNull(),
    estimatedSize: text("estimated_size").notNull(),
    preferredArtist: text("preferred_artist").notNull(),
    status: text("status").notNull().default("draft"),
    uploadTokenHash: text("upload_token_hash").notNull(),
    uploadTokenExpiresAt: timestamp("upload_token_expires_at", {
      withTimezone: true,
    }).notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    notificationStatus: text("notification_status").notNull().default("pending"),
    notificationError: text("notification_error"),
    notificationSentAt: timestamp("notification_sent_at", {
      withTimezone: true,
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("tattoo_bookings_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    index("tattoo_bookings_fingerprint_created_idx").on(
      table.requestFingerprint,
      table.createdAt,
    ),
  ],
);

export const tattooBookingReferencesTable = pgTable(
  "tattoo_booking_references",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => tattooBookingsTable.id, { onDelete: "cascade" }),
    objectPath: text("object_path").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tattoo_booking_references_object_path_unique").on(
      table.objectPath,
    ),
    index("tattoo_booking_references_booking_idx").on(table.bookingId),
  ],
);

export const insertTattooBookingSchema = createInsertSchema(
  tattooBookingsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  notificationSentAt: true,
  submittedAt: true,
});

export const insertTattooBookingReferenceSchema = createInsertSchema(
  tattooBookingReferencesTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertTattooBooking = z.infer<typeof insertTattooBookingSchema>;
export type TattooBooking = typeof tattooBookingsTable.$inferSelect;
export type TattooBookingReference =
  typeof tattooBookingReferencesTable.$inferSelect;
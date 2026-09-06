import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const smsSubscriptionsTable = pgTable(
  "sms_subscriptions",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    phoneE164: text("phone_e164").notNull(),
    consentStatus: text("consent_status").notNull().default("pending"),
    consentSource: text("consent_source").notNull(),
    source: text("source"),
    pageUrl: text("page_url").notNull(),
    consentDisclosureVersion: text("consent_disclosure_version").notNull(),
    consentRequestedAt: timestamp("consent_requested_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    confirmationRequestedAt: timestamp("confirmation_requested_at", {
      withTimezone: true,
    }),
    confirmationError: text("confirmation_error"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
    helpRequestedAt: timestamp("help_requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("sms_subscriptions_phone_unique").on(table.phoneE164),
    index("sms_subscriptions_status_requested_idx").on(
      table.consentStatus,
      table.consentRequestedAt,
    ),
  ],
);

export const insertSmsSubscriptionSchema = createInsertSchema(
  smsSubscriptionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSmsSubscription = z.infer<
  typeof insertSmsSubscriptionSchema
>;
export type SmsSubscription = typeof smsSubscriptionsTable.$inferSelect;

export const smsConfirmationAttemptsTable = pgTable(
  "sms_confirmation_attempts",
  {
    id: serial("id").primaryKey(),
    requestKey: text("request_key").notNull(),
    requesterKey: text("requester_key").notNull(),
    phoneE164: text("phone_e164").notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sms_confirmation_attempts_request_key_unique").on(
      table.requestKey,
    ),
    index("sms_confirmation_attempts_phone_idx").on(table.phoneE164),
    index("sms_confirmation_attempts_requester_idx").on(table.requesterKey),
    index("sms_confirmation_attempts_last_attempt_idx").on(table.lastAttemptAt),
  ],
);

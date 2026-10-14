import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// No private message body is duplicated here. A fingerprint rejects key reuse
// for a different payload; a deleted message is never recreated by a retry.
export const messageSendReceiptsTable = pgTable("message_send_receipts", {
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  clientRequestId: uuid("client_request_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  messageId: integer("message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.senderId, t.clientRequestId] })]);

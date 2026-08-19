import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export type StoreShippingAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
};

export const storeOrdersTable = pgTable("store_orders", {
  id: text("id").primaryKey(),
  confirmationToken: text("confirmation_token").notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  customerEmail: text("customer_email").notNull(),
  status: text("status").notNull().default("creating"),
  currency: text("currency").notNull().default("usd"),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull().default(0),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  shippingAddress: jsonb("shipping_address").$type<StoreShippingAddress | null>(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("store_orders_confirmation_token_unique").on(table.confirmationToken),
  uniqueIndex("store_orders_payment_intent_unique").on(table.stripePaymentIntentId),
  index("store_orders_user_id_idx").on(table.userId),
  index("store_orders_status_idx").on(table.status),
]);

export const storeOrderItemsTable = pgTable("store_order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => storeOrdersTable.id, { onDelete: "cascade" }),
  stripeProductId: text("stripe_product_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  productName: text("product_name").notNull(),
  productDescription: text("product_description").notNull(),
  productCategory: text("product_category").notNull(),
  productImageKey: text("product_image_key").notNull(),
  fulfillmentType: text("fulfillment_type").notNull(),
  quantity: integer("quantity").notNull(),
  unitAmountCents: integer("unit_amount_cents").notNull(),
  totalAmountCents: integer("total_amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("store_order_items_order_id_idx").on(table.orderId),
]);

export const storeWebhookEventsTable = pgTable("store_webhook_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStoreOrderSchema = createInsertSchema(storeOrdersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertStoreOrderItemSchema = createInsertSchema(storeOrderItemsTable).omit({
  id: true,
  createdAt: true,
});

export type StoreOrder = typeof storeOrdersTable.$inferSelect;
export type StoreOrderItem = typeof storeOrderItemsTable.$inferSelect;
export type InsertStoreOrder = z.infer<typeof insertStoreOrderSchema>;
export type InsertStoreOrderItem = z.infer<typeof insertStoreOrderItemSchema>;
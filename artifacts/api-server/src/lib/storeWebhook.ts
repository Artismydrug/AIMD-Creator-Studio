import type Stripe from "stripe";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  storeOrdersTable,
  storeWebhookEventsTable,
  type StoreOrder,
} from "@workspace/db";

type StoreOrderUpdate = {
  paymentIntentId: string;
  status: "processing" | "paid" | "failed" | "canceled" | "refunded" | "disputed";
  paidAt?: Date;
};

function getStoreOrderUpdate(event: Stripe.Event): StoreOrderUpdate | null {
  switch (event.type) {
    case "payment_intent.processing": {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { paymentIntentId: intent.id, status: "processing" };
    }
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        paymentIntentId: intent.id,
        status: "paid",
        paidAt: new Date(event.created * 1000),
      };
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { paymentIntentId: intent.id, status: "failed" };
    }
    case "payment_intent.canceled": {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { paymentIntentId: intent.id, status: "canceled" };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
      return paymentIntentId ? { paymentIntentId, status: "refunded" } : null;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id;
      return paymentIntentId ? { paymentIntentId, status: "disputed" } : null;
    }
    default:
      return null;
  }
}

const allowedPreviousStatuses: Record<
  StoreOrderUpdate["status"],
  StoreOrder["status"][]
> = {
  processing: ["creating", "awaiting_payment", "processing", "failed"],
  paid: ["creating", "awaiting_payment", "processing", "failed", "paid"],
  failed: ["creating", "awaiting_payment", "processing", "failed"],
  canceled: ["creating", "awaiting_payment", "processing", "failed", "canceled"],
  refunded: [
    "creating",
    "awaiting_payment",
    "processing",
    "failed",
    "canceled",
    "paid",
    "refunded",
  ],
  disputed: [
    "creating",
    "awaiting_payment",
    "processing",
    "failed",
    "canceled",
    "paid",
    "refunded",
    "disputed",
  ],
};

export async function processStoreWebhookEvent(event: Stripe.Event): Promise<void> {
  const update = getStoreOrderUpdate(event);
  if (!update) return;

  await db.transaction(async (tx) => {
    const [processed] = await tx
      .select({ id: storeWebhookEventsTable.stripeEventId })
      .from(storeWebhookEventsTable)
      .where(eq(storeWebhookEventsTable.stripeEventId, event.id))
      .limit(1);
    if (processed) return;

    await tx
      .update(storeOrdersTable)
      .set({
        status: update.status,
        ...(update.paidAt ? { paidAt: update.paidAt } : {}),
        updatedAt: new Date(),
      })
      .where(and(
        eq(storeOrdersTable.stripePaymentIntentId, update.paymentIntentId),
        inArray(storeOrdersTable.status, allowedPreviousStatuses[update.status]),
      ));

    await tx.insert(storeWebhookEventsTable).values({
      stripeEventId: event.id,
      eventType: event.type,
    });
  });
}
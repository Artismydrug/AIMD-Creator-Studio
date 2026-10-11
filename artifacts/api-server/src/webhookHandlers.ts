import type Stripe from "stripe";
import { withStripeSync } from './stripeClient';
import { processStoreWebhookEvent } from "./lib/storeWebhook";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // StripeSync verifies this exact raw payload and, when the connector does
    // not expose a webhook secret, securely loads the managed secret from its
    // own stripe._managed_webhooks table.
    await withStripeSync((sync) => sync.processWebhook(payload, signature));
    const event = JSON.parse(payload.toString("utf8")) as Stripe.Event;
    await processStoreWebhookEvent(event);
  }
}

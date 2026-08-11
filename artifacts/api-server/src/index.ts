import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { ensureEventTables } from './lib/ensureEventTables';
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * Initialize Stripe schema and sync existing data.
 * Order matters: migrations → StripeSync → webhook → backfill.
 */
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for Stripe.');
  }

  try {
    logger.info('Initializing Stripe schema…');
    // MigrationConfig only accepts { databaseUrl, ssl?, logger? } — no `schema` key
    await runMigrations({ databaseUrl });
    logger.info('Stripe schema ready');

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    logger.info({ url: `${webhookBaseUrl}/api/stripe/webhook` }, 'Setting up managed webhook…');
    // findOrCreateManagedWebhook returns Stripe.WebhookEndpoint directly (not { webhook })
    const webhookEndpoint = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    logger.info({ webhookUrl: webhookEndpoint?.url }, 'Webhook configured');

    // Backfill runs in the background — don't block server startup.
    // Must pass { object: "all" } — calling with no args defaults to a function
    // reference that matches no switch case and syncs nothing.
    stripeSync.syncBackfill({ object: 'all' } as any)
      .then(() => logger.info('Stripe backfill complete'))
      .catch((err) => logger.error({ err }, 'Stripe backfill error'));

  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Stripe');
    throw error;
  }
}

// Ensure event_attendances table exists (idempotent — safe across restarts).
// This is a hard prerequisite for the check-in feature; crash if it fails.
await ensureEventTables();
logger.info('Event tables verified');

// Stripe init is non-fatal — the server must start even if Stripe is unavailable
try {
  await initStripe();
} catch (err) {
  logger.warn({ err }, 'Stripe init failed — payments disabled until resolved');
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

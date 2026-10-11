import Stripe from 'stripe';
import { StripeSync } from 'stripe-replit-sync';
import { createClientLifecycle } from "./lib/stripeSyncLifecycle";
import { logger } from "./lib/logger";

/**
 * Fetches Stripe credentials from the Replit connection API.
 * Not cached — tokens can rotate, so fetch fresh each time.
 */
async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      'Missing Replit environment variables. ' +
      'Ensure the Stripe integration is connected via the Integrations tab.'
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = (await resp.json()) as { items?: Array<{ settings?: { secret?: string; webhook_secret?: string } }> };
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret) {
    throw new Error(
      'Stripe integration not connected or missing secret key. ' +
      'Connect Stripe via the Integrations tab first.'
    );
  }

  return {
    secretKey: settings.secret,
    webhookSecret: settings.webhook_secret,
  };
}

/**
 * Returns a fresh authenticated Stripe client.
 * Not cached — fetches credentials on every call so rotated keys are picked up.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

const syncLifecycle = createClientLifecycle(
  getStripeCredentials,
  (a, b) => a.secretKey === b.secretKey && a.webhookSecret === b.webhookSecret,
  ({ secretKey, webhookSecret }) => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");
    const client = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL,
        // SDK advisory locks hold a dedicated connection while their callback
        // uses another. Two simultaneous operations need four connections.
        max: 4,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 10_000,
        statement_timeout: 15_000,
        query_timeout: 17_000,
      },
      stripeSecretKey: secretKey,
      stripeWebhookSecret: webhookSecret ?? "",
    });
    client.postgresClient.pool.on("error", (error) => {
      logger.error({ errorName: error.name, errorCode: (error as NodeJS.ErrnoException).code }, "Idle Stripe database connection failed");
    });
    return client;
  },
  async (client) => {
    try { await client.postgresClient.pool.end(); }
    catch (error) {
      logger.error({ errorName: (error as Error).name }, "Stripe database pool cleanup failed");
      throw error;
    }
  },
);

let activeSyncOperations = 0;
export async function withStripeSync<T>(operation: (client: StripeSync) => Promise<T>): Promise<T> {
  if (activeSyncOperations >= 2) {
    throw Object.assign(new Error("Stripe processing is temporarily busy"), { status: 503 });
  }
  activeSyncOperations++;
  try { return await syncLifecycle.run(operation); }
  finally { activeSyncOperations--; }
}
export const closeStripeSyncPools = syncLifecycle.close;

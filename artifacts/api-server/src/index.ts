import { closeStripeSyncPools } from './stripeClient';
import { pool } from "@workspace/db";
import { verifyApplicationSchema } from "./lib/schemaReadiness";
import { setServerDraining } from "./lib/serverReliability";
import { ensureEventTables } from './lib/ensureEventTables';
import { ensureAuthSchema } from './lib/ensureAuthSchema';
import { ensureChallengeTables } from './lib/ensureChallengeTables';
import { ensureUserTierCompatibility } from './lib/ensureUserTierCompatibility';
import { ensureCreatorStudioSchema } from './lib/ensureCreatorStudioSchema';
import { ensureSmsSubscriptionTable } from './lib/ensureSmsSubscriptionTable';
import app from "./app";
import { logger } from "./lib/logger";

// Observe fatal exceptions without suppressing Node's exit/restart behavior.
// Error messages and stacks can contain SQL parameters, URLs and credentials.
process.on("uncaughtExceptionMonitor", (error, origin) => {
  const types = ["TypeError", "ReferenceError", "RangeError", "SyntaxError", "Error"];
  logger.fatal({ errorType: types.includes(error.name) ? error.name : "Error", origin }, "Unhandled API exception");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

pool.on("error", (error) => {
  logger.error({ errorName: error.name, errorCode: (error as NodeJS.ErrnoException).code }, "Idle database connection failed");
});

// Ensure auth schema exists (sessions table + users.replit_id column).
// Idempotent — safe across restarts and deployments.
if (process.env.NODE_ENV === "development") {
  await ensureAuthSchema();
  logger.info('Auth schema verified');

// Preserve Tier 2 entitlements created under the legacy "workshop" tier name.
  await ensureUserTierCompatibility();
  logger.info('User tier compatibility verified');

// Ensure event_attendances table exists (idempotent — safe across restarts).
// This is a hard prerequisite for the check-in feature; crash if it fails.
  await ensureEventTables();
  logger.info('Event tables verified');

// Ensure challenge_submissions, challenge_votes, and badges.event_code exist.
  await ensureChallengeTables();
  logger.info('Challenge tables verified');

// Ensure users.stripe_customer_id plus the instructor/assignment extension
// tables exist before any route references them (idempotent).
  await ensureCreatorStudioSchema();
  logger.info('Creator Studio schema verified');

  await ensureSmsSubscriptionTable();
  logger.info('SMS subscription schema verified');
} else {
  // Autoscale replicas must not contend on DDL or repeat provider setup.
  await verifyApplicationSchema();
  // Retain the existing, idempotent legacy entitlement normalization.
  await ensureUserTierCompatibility();
  logger.info("Published application schema verified");
}

// Provider migrations, webhook provisioning and full catalog backfills are
// explicit maintenance operations, never repeated during an API cold start.
// Existing managed Stripe webhook verification/processing remains unchanged.
const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  setServerDraining();
  logger.info({ signal }, "Draining API requests");
  const deadline = setTimeout(() => {
    logger.warn("Shutdown deadline reached; closing remaining connections");
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  deadline.unref();
  try {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await Promise.all([closeStripeSyncPools(), pool.end()]);
    clearTimeout(deadline);
    process.exit(0);
  } catch (error) {
    logger.error({ errorName: (error as Error).name }, "API shutdown failed");
    process.exit(1);
  }
}
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("SIGINT", () => { void shutdown("SIGINT"); });

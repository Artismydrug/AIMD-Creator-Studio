/**
 * Clerk webhook handler.
 *
 * Handles `user.updated` and `user.deleted` events delivered by Clerk via Svix.
 * The raw request body must be passed through unchanged (no JSON body parser
 * before this route) so that Svix can verify the HMAC signature.
 *
 * Environment variable required:
 *   CLERK_WEBHOOK_SECRET  — the "Signing Secret" shown in the Clerk dashboard
 *                           under Webhooks → (your endpoint) → Signing Secret.
 */

import type { Request, Response } from "express";
import { Webhook } from "svix";
import { db, usersTable, eventRsvpsTable, eventAttendancesTable, sponsorshipsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "../../lib/logger";

// ── Clerk event payload types (minimal) ──────────────────────────────────────

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string; // Clerk user ID, e.g. "user_2abc..."
  primary_email_address_id: string;
  email_addresses: ClerkEmailAddress[];
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  deleted?: boolean;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

// ── Svix signature verification ───────────────────────────────────────────────

function getWebhookSecret(): string {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("CLERK_WEBHOOK_SECRET environment variable is not set");
  }
  return secret;
}

// ── Express route handler (exported for app.ts) ───────────────────────────────

export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  // Svix headers required for verification
  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing Svix headers" });
    return;
  }

  // Short-circuit early if the secret is not configured, so Clerk retries later.
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("CLERK_WEBHOOK_SECRET is not set — rejecting webhook delivery");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    // req.body is a Buffer (raw body parser applied in app.ts before express.json)
    const payload =
      req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err: any) {
    logger.warn({ err }, "Clerk webhook signature verification failed");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const { type, data } = event;
  logger.info({ eventType: type, clerkUserId: data.id }, "Clerk webhook received");

  try {
    if (type === "user.updated") {
      await handleUserUpdated(data);
    } else if (type === "user.deleted") {
      await handleUserDeleted(data);
    }
    // Other event types are acknowledged but ignored.
    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error({ err, eventType: type, clerkUserId: data.id }, "Clerk webhook processing error");
    res.status(500).json({ error: "Internal processing error" });
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleUserUpdated(data: ClerkUserPayload): Promise<void> {
  const primaryEmail = data.email_addresses
    .find((e) => e.id === data.primary_email_address_id)
    ?.email_address?.toLowerCase()
    .trim();

  if (!primaryEmail) {
    logger.warn({ clerkUserId: data.id }, "user.updated: no primary email found, skipping");
    return;
  }

  // Primary lookup: by stable Clerk ID.
  // Fallback: by email ONLY for legacy rows where clerk_id IS NULL.
  // Never rebind a row that already has a different clerk_id — that would
  // allow an account-takeover via recycled or shared email addresses.
  let [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, data.id))
    .limit(1);

  if (!existing) {
    const [emailRow] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, primaryEmail), isNull(usersTable.clerkId)))
      .limit(1);
    existing = emailRow;
  }

  if (!existing) {
    // User has never logged in locally — JIT bridge will handle provisioning.
    logger.info({ clerkUserId: data.id }, "user.updated: no local row found, skipping");
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  // Always back-fill clerkId if missing (covers the migration window).
  if (!existing.clerkId) {
    updates.clerkId = data.id;
  }

  // Sync primary email if it changed.
  if (existing.email !== primaryEmail) {
    updates.email = primaryEmail;
  }

  // Sync first_name / last_name from Clerk identity fields.
  // These are separate from the app-level `username` handle so there is no
  // uniqueness risk — they are purely display/identity metadata.
  const firstName = data.first_name?.trim() ?? null;
  const lastName = data.last_name?.trim() ?? null;

  if (existing.firstName !== firstName) {
    updates.firstName = firstName;
  }
  if (existing.lastName !== lastName) {
    updates.lastName = lastName;
  }

  if (Object.keys(updates).length === 0) {
    logger.info({ clerkUserId: data.id }, "user.updated: no tracked fields changed");
    return;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, existing.id));
  logger.info({ clerkUserId: data.id, updates }, "user.updated: local row synced");
}

async function handleUserDeleted(data: ClerkUserPayload): Promise<void> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, data.id))
    .limit(1);

  if (!existing) {
    logger.info({ clerkUserId: data.id }, "user.deleted: no local row found, nothing to do");
    return;
  }

  const userId = existing.id;

  // Remove child rows whose FK references do NOT cascade, then delete the user.
  // Tables with ON DELETE CASCADE (studio_posts, badges, habits, enrollments,
  // habit_logs, post_likes, completed_modules) are handled automatically by Postgres.
  await db.transaction(async (tx) => {
    // event_rsvps — no cascade
    await tx.delete(eventRsvpsTable).where(eq(eventRsvpsTable.userId, userId));

    // event_attendances — no cascade
    await tx.delete(eventAttendancesTable).where(eq(eventAttendancesTable.userId, userId));

    // sponsorships — two nullable FKs; null them out to preserve the record
    await tx
      .update(sponsorshipsTable)
      .set({ sponsorUserId: null })
      .where(eq(sponsorshipsTable.sponsorUserId, userId));

    await tx
      .update(sponsorshipsTable)
      .set({ creatorId: null })
      .where(eq(sponsorshipsTable.creatorId, userId));

    // Delete the user; cascading FKs handle the remaining child rows.
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });

  logger.info({ clerkUserId: data.id, localUserId: userId }, "user.deleted: local row removed");
}

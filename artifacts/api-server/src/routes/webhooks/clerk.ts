/**
 * Clerk webhook handler.
 *
 * Handles `user.created`, `user.updated`, and `user.deleted` events delivered
 * by Clerk via Svix. The raw request body must be passed through unchanged (no
 * JSON body parser before this route) so that Svix can verify the HMAC signature.
 *
 * Environment variable required:
 *   CLERK_WEBHOOK_SECRET  — the "Signing Secret" shown in the Clerk dashboard
 *                           under Webhooks → (your endpoint) → Signing Secret.
 */

import type { Request, Response } from "express";
import { Webhook } from "svix";
import {
  db,
  deletedClerkUsersTable,
  usersTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { validateRoleMetadataHints } from "../../lib/roleMetadataSync";
import { deleteLocalAccountByClerkId } from "../../lib/accountDeletion";

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
  /**
   * Clerk public_metadata — written ONLY by server-side admin actions.
   * Values are advisory/display hints. DB is always authoritative for auth.
   * See roleMetadataSync.ts for the shared validation logic.
   */
  public_metadata?: {
    aimdRole?: string;
    mentorSlug?: string;
    [key: string]: unknown;
  };
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

// ── Svix signature verification ───────────────────────────────────────────────

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
    if (type === "user.created" || type === "user.updated") {
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
  const [deletedIdentity] = await db
    .select({ clerkId: deletedClerkUsersTable.clerkId })
    .from(deletedClerkUsersTable)
    .where(eq(deletedClerkUsersTable.clerkId, data.id))
    .limit(1);
  if (deletedIdentity) {
    logger.info({ clerkUserId: data.id }, "user.updated: deleted identity ignored");
    return;
  }

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

  // ── Sync basic identity fields ─────────────────────────────────────────────
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

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, existing.id));
    logger.info({ clerkUserId: data.id, updates }, "user.updated: local row synced");
  } else {
    logger.info({ clerkUserId: data.id }, "user.updated: no tracked fields changed");
  }

  // ── Validate public_metadata role hints (shared with JIT auth) ─────────────
  //
  // Uses the SAME validateRoleMetadataHints() function used in clerkAuth.ts so
  // both paths share identical validation logic.
  //
  // This does NOT create or modify any DB rows. It only:
  //  1. Verifies mentorSlug is backed by an already DB-linked instructor profile.
  //  2. Checks that aimdRole claims are consistent with the DB role table.
  //  3. Logs discrepancies — admin must explicitly link/grant via the admin API.
  const metaRole = data.public_metadata?.aimdRole;
  const metaMentorSlug = data.public_metadata?.mentorSlug;

  if (metaRole || metaMentorSlug) {
    await validateRoleMetadataHints(
      existing.id,
      data.id,
      { aimdRole: metaRole, mentorSlug: metaMentorSlug },
    );
  }
}

async function handleUserDeleted(data: ClerkUserPayload): Promise<void> {
  await deleteLocalAccountByClerkId(data.id);
  logger.info({ clerkUserId: data.id }, "user.deleted: local account cleanup complete");
}

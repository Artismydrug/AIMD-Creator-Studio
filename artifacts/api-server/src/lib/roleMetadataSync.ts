/**
 * Shared helper: validate and log Clerk public_metadata role hints.
 *
 * This is the SINGLE implementation used by both:
 *   - JIT auth (clerkAuth.ts) — on every authenticated request for new users
 *   - Clerk webhook (clerk.ts) — on user.created / user.updated events
 *
 * SECURITY CONTRACT
 * ─────────────────
 * public_metadata is server-controlled (written only by server-side Clerk API
 * calls from admin actions). It is NEVER used as an authorization source.
 * This function ONLY validates that the metadata is consistent with the DB state
 * and logs discrepancies — it does NOT create, modify, or grant any roles.
 *
 * The DB tables `user_roles` and `instructor_profiles` are always authoritative.
 */

import { and, eq } from "drizzle-orm";
import { db, instructorProfilesTable, userRolesTable } from "@workspace/db";
import { logger } from "./logger";

export interface ClerkRoleMetadata {
  aimdRole?: string;
  mentorSlug?: string;
}

/**
 * Validate Clerk public_metadata role hints against the DB.
 *
 * - If `mentorSlug` is present, verify that an instructor_profile row exists
 *   with that slug AND is already linked to `localUserId`. If the slug does
 *   not match a DB-linked profile the mismatch is logged and ignored — no
 *   profile is created or linked.
 *
 * - If `aimdRole` is "instructor" or "admin", verify the claim against the
 *   DB role table. A claim that is NOT backed by a DB row is logged as a
 *   warning. No role row is ever created by this function.
 *
 * @param localUserId  Internal DB user id (users.id)
 * @param clerkUserId  Clerk user id for log context only
 * @param metadata     Clerk public_metadata partial
 */
export async function validateRoleMetadataHints(
  localUserId: number,
  clerkUserId: string,
  metadata: ClerkRoleMetadata,
): Promise<void> {
  const { aimdRole, mentorSlug } = metadata;

  // ── 1. Validate mentorSlug against a DB-linked instructor profile ───────────
  if (mentorSlug) {
    const [profile] = await db
      .select({ id: instructorProfilesTable.id, userId: instructorProfilesTable.userId })
      .from(instructorProfilesTable)
      .where(
        and(
          eq(instructorProfilesTable.mentorSlug, mentorSlug),
          eq(instructorProfilesTable.userId, localUserId),
        ),
      )
      .limit(1);

    if (profile) {
      // ✓ Consistent: the linked DB profile matches the metadata slug.
      logger.debug(
        { clerkUserId, localUserId, mentorSlug },
        "roleMetadataSync: mentorSlug matches linked instructor profile",
      );
    } else {
      // ✗ Mismatch: metadata claims a slug that isn't linked to this user.
      // Log as warning; take no action — admin must explicitly link via API.
      logger.warn(
        { clerkUserId, localUserId, mentorSlug },
        "roleMetadataSync: mentorSlug in metadata does not match any DB-linked instructor profile — ignored",
      );
    }
  }

  // ── 2. Verify aimdRole claim against the DB role table ──────────────────────
  if (aimdRole === "instructor" || aimdRole === "admin") {
    // Check whether the DB actually has this role for the user.
    const [roleRow] = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, localUserId))
      .limit(1);

    const dbRole = roleRow?.role ?? null;

    if (dbRole === aimdRole || (aimdRole === "admin" && (roleRow === undefined ? false : true))) {
      // Consistent: metadata matches DB.
      // For admin we also check the legacy isAdmin column via the caller.
      logger.debug(
        { clerkUserId, localUserId, aimdRole, dbRole },
        "roleMetadataSync: aimdRole claim is consistent with DB",
      );
    } else {
      // Inconsistent: metadata claims a role the DB does not grant.
      // This is expected during the window between an admin action and the
      // webhook delivery. Log as info, not warn — no security concern because
      // this function never grants anything.
      logger.info(
        { clerkUserId, localUserId, aimdRole, dbRole },
        "roleMetadataSync: aimdRole in metadata not yet reflected in DB role table — no action taken",
      );
    }
  }
}

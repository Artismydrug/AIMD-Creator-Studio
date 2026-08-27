import {
  db,
  deletedClerkUsersTable,
  eventAttendancesTable,
  eventRsvpsTable,
  pool,
  sponsorshipsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";
import { ObjectStorageService } from "./objectStorage";

type DeleteLocalAccountOptions = {
  clerkUserId: string;
  localUserId?: number;
};

type MediaReference = {
  path: string;
  ownerId: number | null;
  source: string;
};

const objectStorageService = new ObjectStorageService();
const API_STORAGE_OBJECTS_PREFIX = "/api/storage/objects/";

/**
 * Record the deleted Clerk identity and remove its local data atomically.
 *
 * The tombstone is intentionally kept after the user row is deleted. Clerk
 * JWTs can remain valid until expiry, so clerkAuth checks it before attempting
 * JIT provisioning.
 */
export async function deleteLocalAccount({
  clerkUserId,
  localUserId,
}: DeleteLocalAccountOptions): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(deletedClerkUsersTable)
      .values({ clerkId: clerkUserId })
      .onConflictDoNothing();

    if (localUserId === undefined) return;

    // Lock the user before collecting references. PostgreSQL foreign-key
    // checks then prevent a concurrent upload row from being added while
    // cleanup is in progress.
    await tx.execute(sql`
      SELECT id FROM users WHERE id = ${localUserId} FOR UPDATE
    `);

    const userMedia = await getUserMediaReferences(tx, localUserId);
    await deleteOwnedUserMedia(tx, localUserId, userMedia);

    // These legacy tables do not have ON DELETE CASCADE.
    await tx.delete(eventRsvpsTable).where(eq(eventRsvpsTable.userId, localUserId));
    await tx
      .delete(eventAttendancesTable)
      .where(eq(eventAttendancesTable.userId, localUserId));

    // Preserve sponsorship records while removing the deleted user's identity.
    await tx
      .update(sponsorshipsTable)
      .set({ sponsorUserId: null })
      .where(eq(sponsorshipsTable.sponsorUserId, localUserId));
    await tx
      .update(sponsorshipsTable)
      .set({ creatorId: null })
      .where(eq(sponsorshipsTable.creatorId, localUserId));

    // Remaining user-owned rows use cascading foreign keys.
    await tx.delete(usersTable).where(eq(usersTable.id, localUserId));
  });
}

/**
 * Collect media references while the user rows still exist. This includes
 * legacy URL columns as well as the newer upload ledgers so a deletion does
 * not rely on cascading row deletes to discover object paths.
 */
async function getUserMediaReferences(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: number,
): Promise<MediaReference[]> {
  const result = await tx.execute(sql`
    SELECT path, owner_id AS "ownerId", source
    FROM (
      SELECT u.avatar_url AS path, u.id AS owner_id, 'users.avatar_url' AS source
        FROM users u
       WHERE u.id = ${userId}

      UNION ALL
      SELECT p.image_url, p.user_id, 'studio_posts.image_url'
        FROM studio_posts p
       WHERE p.user_id = ${userId}
         AND p.image_url IS NOT NULL

      UNION ALL
      SELECT hl.proof_url, hl.user_id, 'habit_logs.proof_url'
        FROM habit_logs hl
       WHERE hl.user_id = ${userId}
         AND hl.proof_url IS NOT NULL

      UNION ALL
      SELECT cm.object_path, cm.user_id, 'challenge_media_uploads.object_path'
        FROM challenge_media_uploads cm
       WHERE cm.user_id = ${userId}

      UNION ALL
      SELECT cs.image_url, cs.user_id, 'challenge_submissions.image_url'
        FROM challenge_submissions cs
       WHERE cs.user_id = ${userId}
         AND cs.image_url IS NOT NULL

      UNION ALL
      SELECT am.object_path, am.user_id, 'assignment_media_uploads.object_path'
        FROM assignment_media_uploads am
       WHERE am.user_id = ${userId}

      UNION ALL
      SELECT a.submission_url, a.user_id, 'assignments.submission_url'
        FROM assignments a
       WHERE a.user_id = ${userId}
         AND a.submission_url IS NOT NULL

      UNION ALL
      SELECT unnest(ra.portfolio_object_paths), ra.user_id,
             'residency_applications.portfolio_object_paths'
        FROM residency_applications ra
       WHERE ra.user_id = ${userId}

      UNION ALL
      SELECT ra.bbp_certification_object_path, ra.user_id,
             'residency_applications.bbp_certification_object_path'
        FROM residency_applications ra
       WHERE ra.user_id = ${userId}
         AND ra.bbp_certification_object_path IS NOT NULL

      UNION ALL
      SELECT ra.introduction_video_object_path, ra.user_id,
             'residency_applications.introduction_video_object_path'
        FROM residency_applications ra
       WHERE ra.user_id = ${userId}
         AND ra.introduction_video_object_path IS NOT NULL
    ) media_refs
    WHERE path IS NOT NULL
  `);

  return result.rows as unknown as MediaReference[];
}

/**
 * Delete only unshared, ACL-owned object entities. The reference query covers
 * both creator-owned tables and tables whose media is owned by the platform or
 * another workflow. Any ownerless reference conservatively keeps the object.
 */
async function deleteOwnedUserMedia(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: number,
  userMedia: MediaReference[],
): Promise<void> {
  const candidates = uniqueMediaPaths(userMedia);
  if (candidates.length === 0) return;

  const lookupPaths = Array.from(
    new Set(candidates.flatMap((path) => objectPathVariants(path))),
  );
  const lookupPathArray = sql`ARRAY[${sql.join(
    lookupPaths.map((path) => sql`${path}`),
    sql`, `,
  )}]::text[]`;
  const result = await tx.execute(sql`
    SELECT path, owner_id AS "ownerId", source
    FROM (
      SELECT u.avatar_url AS path, u.id AS owner_id, 'users.avatar_url' AS source
        FROM users u
       WHERE u.avatar_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT p.image_url, p.user_id, 'studio_posts.image_url'
        FROM studio_posts p
       WHERE p.image_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT hl.proof_url, hl.user_id, 'habit_logs.proof_url'
        FROM habit_logs hl
       WHERE hl.proof_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT cm.object_path, cm.user_id, 'challenge_media_uploads.object_path'
        FROM challenge_media_uploads cm
       WHERE cm.object_path = ANY(${lookupPathArray})

      UNION ALL
      SELECT cs.image_url, cs.user_id, 'challenge_submissions.image_url'
        FROM challenge_submissions cs
       WHERE cs.image_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT am.object_path, am.user_id, 'assignment_media_uploads.object_path'
        FROM assignment_media_uploads am
       WHERE am.object_path = ANY(${lookupPathArray})

      UNION ALL
      SELECT a.submission_url, a.user_id, 'assignments.submission_url'
        FROM assignments a
       WHERE a.submission_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT unnest(ra.portfolio_object_paths), ra.user_id,
             'residency_applications.portfolio_object_paths'
        FROM residency_applications ra
       WHERE ra.portfolio_object_paths && ${lookupPathArray}

      UNION ALL
      SELECT ra.bbp_certification_object_path, ra.user_id,
             'residency_applications.bbp_certification_object_path'
        FROM residency_applications ra
       WHERE ra.bbp_certification_object_path = ANY(${lookupPathArray})

      UNION ALL
      SELECT ra.introduction_video_object_path, ra.user_id,
             'residency_applications.introduction_video_object_path'
        FROM residency_applications ra
       WHERE ra.introduction_video_object_path = ANY(${lookupPathArray})

      UNION ALL
      SELECT tbr.object_path, NULL::integer, 'tattoo_booking_references.object_path'
        FROM tattoo_booking_references tbr
       WHERE tbr.object_path = ANY(${lookupPathArray})

      UNION ALL
      SELECT ae.feedback_audio_url, NULL::integer, 'assignment_extensions.feedback_audio_url'
        FROM assignment_extensions ae
       WHERE ae.feedback_audio_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT ae.feedback_video_url, NULL::integer, 'assignment_extensions.feedback_video_url'
        FROM assignment_extensions ae
       WHERE ae.feedback_video_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT ip.avatar_url, NULL::integer, 'instructor_profiles.avatar_url'
        FROM instructor_profiles ip
       WHERE ip.avatar_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT e.image_url, NULL::integer, 'community_events.image_url'
        FROM community_events e
       WHERE e.image_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT b.image_url, NULL::integer, 'badges.image_url'
        FROM badges b
       WHERE b.image_url = ANY(${lookupPathArray})

      UNION ALL
      SELECT s.sponsor_avatar_url, NULL::integer, 'sponsorships.sponsor_avatar_url'
        FROM sponsorships s
       WHERE s.sponsor_avatar_url = ANY(${lookupPathArray})
    ) media_refs
    WHERE path IS NOT NULL
  `);

  const allReferences = result.rows as unknown as MediaReference[];
  const targetId = String(userId);

  for (const rawPath of candidates) {
    if (!isObjectEntityReference(rawPath)) continue;

    const variants = new Set(objectPathVariants(rawPath));
    const references = allReferences.filter((reference) => variants.has(reference.path));
    const hasUnsafeReference = references.some(
      (reference) => reference.ownerId === null || reference.ownerId !== userId,
    );

    if (hasUnsafeReference) {
      logger.warn(
        { userId, objectPath: rawPath },
        "Account deletion kept a shared or non-user-owned object",
      );
      continue;
    }

    try {
      const outcome = await objectStorageService.deleteObjectEntityIfOwned(
        rawPath,
        targetId,
      );
      if (outcome === "skipped") {
        logger.warn(
          { userId, objectPath: rawPath },
          "Account deletion skipped an object without matching ownership",
        );
      }
    } catch (error) {
      logger.error(
        { err: error, userId, objectPath: rawPath },
        "Account deletion could not remove an uploaded object",
      );
      throw error;
    }
  }
}

function uniqueMediaPaths(references: MediaReference[]): string[] {
  return Array.from(
    new Set(
      references
        .map((reference) => reference.path)
        .filter((path): path is string => typeof path === "string" && path.length > 0),
    ),
  );
}

function objectPathVariants(rawPath: string): string[] {
  const variants = new Set([rawPath]);
  if (rawPath.startsWith(API_STORAGE_OBJECTS_PREFIX)) {
    variants.add(rawPath.slice("/api/storage".length));
  } else if (rawPath.startsWith("/objects/")) {
    variants.add(`/api/storage${rawPath}`);
  }
  return Array.from(variants);
}

function isObjectEntityReference(rawPath: string): boolean {
  return (
    rawPath.startsWith("/objects/") ||
    rawPath.startsWith(API_STORAGE_OBJECTS_PREFIX) ||
    rawPath.startsWith("https://storage.googleapis.com/")
  );
}

/**
 * Remove a local user by Clerk identity, as used by the deletion webhook.
 */
export async function deleteLocalAccountByClerkId(clerkUserId: string): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    "SELECT id FROM users WHERE clerk_id = $1 LIMIT 1",
    [clerkUserId],
  );
  await deleteLocalAccount({ clerkUserId, localUserId: rows[0]?.id });
}
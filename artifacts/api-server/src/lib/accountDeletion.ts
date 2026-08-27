import {
  db,
  deletedClerkUsersTable,
  eventAttendancesTable,
  eventRsvpsTable,
  pool,
  sponsorshipsTable,
  usersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

type DeleteLocalAccountOptions = {
  clerkUserId: string;
  localUserId?: number;
};

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
 * Remove a local user by Clerk identity, as used by the deletion webhook.
 */
export async function deleteLocalAccountByClerkId(clerkUserId: string): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    "SELECT id FROM users WHERE clerk_id = $1 LIMIT 1",
    [clerkUserId],
  );
  await deleteLocalAccount({ clerkUserId, localUserId: rows[0]?.id });
}
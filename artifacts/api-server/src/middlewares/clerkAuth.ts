import { getAuth } from "@clerk/express";
import { db, deletedClerkUsersTable, usersTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { validateRoleMetadataHints } from "../lib/roleMetadataSync";

// ── Type augmentation ─────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

/**
 * Soft Clerk auth middleware.
 *
 * Runs after clerkMiddleware(). For authenticated requests it resolves
 * (or JIT-creates) the local DB user row by Clerk user ID (preferred) or
 * email (fallback for rows created before clerkId was added) and attaches
 * it as `req.dbUser`. Unauthenticated requests pass through — individual
 * route handlers that require auth check `if (!req.dbUser)`.
 *
 * SECURITY: Clerk public_metadata.aimdRole and mentorSlug are server-controlled
 * fields written only by admin actions. They are NEVER used for authorization.
 * `validateRoleMetadataHints` is called to log consistency between metadata and
 * DB state, but it cannot create, modify, or grant any role row. The DB tables
 * `user_roles` and `instructor_profiles` are always authoritative.
 */
export async function clerkAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    const email = (auth?.sessionClaims?.email as string | undefined)?.toLowerCase().trim();

    if (!clerkUserId && !email) {
      return next();
    }

    // An unexpired mobile token can still pass JWT verification after the
    // Clerk identity is deleted. Never JIT-provision a replacement row.
    if (clerkUserId) {
      const [deletedIdentity] = await db
        .select({ clerkId: deletedClerkUsersTable.clerkId })
        .from(deletedClerkUsersTable)
        .where(eq(deletedClerkUsersTable.clerkId, clerkUserId))
        .limit(1);
      if (deletedIdentity) return next();
    }

    // 1. Look up existing user.
    //    Primary: match by stable Clerk ID.
    //    Fallback: match by email ONLY when the row has no clerk_id yet (legacy
    //    rows created before this column existed). Never rebind a row that is
    //    already attached to a different Clerk account — that would be an
    //    account-takeover via recycled/shared email addresses.
    let [dbUser] = clerkUserId
      ? await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkId, clerkUserId))
          .limit(1)
      : [];

    if (!dbUser && email) {
      // Fallback: legacy email-only row (clerk_id IS NULL).
      const [emailRow] = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.email, email), isNull(usersTable.clerkId)))
        .limit(1);
      dbUser = emailRow;
    }

    // 2. JIT provision: create a new row on first Clerk login.
    let isNewUser = false;
    if (!dbUser) {
      if (!email) {
        return next(); // can't provision without an email
      }

      const rawUsername =
        (auth.sessionClaims?.username as string | undefined) ||
        email.split("@")[0];

      // Sanitise username: alphanumeric + underscores only, max 28 chars,
      // then append a short numeric suffix to avoid conflicts.
      const base = rawUsername.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24);
      const username = `${base}_${Date.now().toString().slice(-4)}`;

      const [inserted] = await db
        .insert(usersTable)
        .values({ email, username, clerkId: clerkUserId ?? null })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        dbUser = inserted;
        isNewUser = true;
      } else if (clerkUserId) {
        // Race condition: another concurrent request may have just inserted the
        // same Clerk account. Re-fetch strictly by Clerk ID — never by email,
        // because the conflict may be with a row owned by a DIFFERENT Clerk
        // account (recycled/shared email). If nothing is found by Clerk ID,
        // leave dbUser undefined so the caller gets an unauthenticated response.
        [dbUser] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkId, clerkUserId))
          .limit(1);
      }
      // No clerkUserId path: email-only sessions can't safely recover from a
      // conflict without risking account-takeover — leave dbUser undefined.
    } else if (clerkUserId && dbUser.clerkId !== clerkUserId) {
      // 3. Back-fill clerkId on existing rows that were created before this
      //    column existed (e.g. legacy email-only rows or Replit-auth rows).
      const [updated] = await db
        .update(usersTable)
        .set({ clerkId: clerkUserId })
        .where(eq(usersTable.id, dbUser.id))
        .returning();
      if (updated) dbUser = updated;
    }

    // 4. On new user provision (or any session), validate Clerk metadata hints
    //    against DB state. This is purely informational — it logs consistency
    //    and never creates or modifies roles.
    if (dbUser && clerkUserId && isNewUser) {
      const metaRole = auth.sessionClaims?.["public_metadata"] as Record<string, unknown> | undefined;
      const aimdRole = typeof metaRole?.["aimdRole"] === "string" ? metaRole["aimdRole"] : undefined;
      const mentorSlug = typeof metaRole?.["mentorSlug"] === "string" ? metaRole["mentorSlug"] : undefined;
      if (aimdRole || mentorSlug) {
        // Fire-and-forget: validation is advisory only; errors must not block auth
        validateRoleMetadataHints(dbUser.id, clerkUserId, { aimdRole, mentorSlug }).catch(() => undefined);
      }
    }

    req.dbUser = dbUser ?? undefined;
    return next();
  } catch (err) {
    return next(err);
  }
}

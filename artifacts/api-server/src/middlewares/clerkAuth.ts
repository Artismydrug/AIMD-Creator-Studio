import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

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
 * (or JIT-creates) the local DB user row by email and attaches it as
 * `req.dbUser`. Unauthenticated requests pass through — individual route
 * handlers that require auth check `if (!req.dbUser)`.
 */
export async function clerkAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string | undefined)?.toLowerCase().trim();

    if (!email) {
      return next();
    }

    // 1. Look up existing user by email (the bridge column).
    let [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // 2. JIT provision: create a new row on first Clerk login.
    if (!dbUser) {
      const rawUsername =
        (auth.sessionClaims?.username as string | undefined) ||
        email.split("@")[0];

      // Sanitise username: alphanumeric + underscores only, max 28 chars,
      // then append a short numeric suffix to avoid conflicts.
      const base = rawUsername.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24);
      const username = `${base}_${Date.now().toString().slice(-4)}`;

      const [inserted] = await db
        .insert(usersTable)
        .values({ email, username })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        dbUser = inserted;
      } else {
        // Race condition: another request just inserted — re-fetch.
        [dbUser] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, email))
          .limit(1);
      }
    }

    req.dbUser = dbUser ?? undefined;
    return next();
  } catch (err) {
    return next(err);
  }
}

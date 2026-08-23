import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, userRolesTable, instructorProfilesTable } from "@workspace/db";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      instructorProfile?: typeof instructorProfilesTable.$inferSelect;
    }
  }
}

/**
 * Route-level guard: requires an authenticated user with role = instructor or admin.
 * Attaches `req.instructorProfile` for downstream use.
 *
 * Authorization is DB-authoritative — Clerk metadata is never used to bypass this.
 */
export async function requireInstructor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = req.dbUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Admins always pass
  if (user.isAdmin) {
    // Attach instructor profile if linked, but don't fail if absent
    const [profile] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.userId, user.id))
      .limit(1);
    req.instructorProfile = profile;
    return next();
  }

  // Check role table
  const [roleRow] = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.userId, user.id))
    .limit(1);

  if (!roleRow || (roleRow.role !== "instructor" && roleRow.role !== "admin")) {
    res.status(403).json({ error: "Instructor role required" });
    return;
  }

  // Load instructor profile
  const [profile] = await db
    .select()
    .from(instructorProfilesTable)
    .where(eq(instructorProfilesTable.userId, user.id))
    .limit(1);

  if (!profile) {
    logger.warn(
      { userId: user.id },
      "requireInstructor: user has instructor role but no profile",
    );
    res.status(403).json({ error: "Instructor profile not found" });
    return;
  }

  req.instructorProfile = profile;
  next();
}

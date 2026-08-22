import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

// ─── Tier rank map ────────────────────────────────────────────────────────────

export type Tier = "free" | "workshop" | "academy" | "pro";

const TIER_RANK: Record<string, number> = {
  free:    0,
  workshop: 1,
  academy: 1,
  pro:     2,
};

export function hasRequiredTier(currentTier: string, minTier: Tier): boolean {
  return (TIER_RANK[currentTier] ?? 0) >= (TIER_RANK[minTier] ?? 0);
}

/**
 * Express middleware that enforces a minimum subscription tier.
 *
 * Usage:
 *   router.post("/assignments", requireTier("academy"), async (req, res) => { ... });
 *
 * On failure responds: 403 { error: "tier_required", requiredTier, currentTier }
 */
export function requireTier(minTier: Tier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [user] = await db
      .select({ tier: usersTable.tier })
      .from(usersTable)
      .where(eq(usersTable.id, req.dbUser.id));

    const currentTier = (user?.tier ?? "free") as Tier;
    if (!hasRequiredTier(currentTier, minTier)) {
      res.status(403).json({
        error: "tier_required",
        requiredTier: minTier,
        currentTier,
        message: `This feature requires the ${minTier === "academy" ? "Academy Pass" : "Pro / Career"} plan or above.`,
      });
      return;
    }

    next();
  };
}

/**
 * Returns the current user's tier from req.user.id.
 */
export async function getCurrentTier(userId: number): Promise<Tier> {
  const [user] = await db
    .select({ tier: usersTable.tier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return (user?.tier ?? "free") as Tier;
}

export const FREE_HABIT_LIMIT = 3;

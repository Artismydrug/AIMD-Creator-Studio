import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

// ─── Tier rank map ────────────────────────────────────────────────────────────

export type Tier = "free" | "academy" | "pro";

const TIER_RANK: Record<string, number> = {
  free:    0,
  academy: 1,
  pro:     2,
};

// Hardcoded for demo auth — replace with session lookup in production
const CURRENT_USER_ID = 1;

/**
 * Express middleware that enforces a minimum subscription tier.
 *
 * Usage:
 *   router.post("/assignments", requireTier("academy"), async (req, res) => { ... });
 *
 * On failure responds: 403 { error: "tier_required", requiredTier, currentTier }
 */
export function requireTier(minTier: Tier) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const [user] = await db
      .select({ tier: usersTable.tier })
      .from(usersTable)
      .where(eq(usersTable.id, CURRENT_USER_ID));

    const currentTier = (user?.tier ?? "free") as Tier;
    const currentRank = TIER_RANK[currentTier] ?? 0;
    const requiredRank = TIER_RANK[minTier] ?? 0;

    if (currentRank < requiredRank) {
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
 * Returns the current user's tier. Useful in route handlers that need
 * tier-conditional logic rather than a hard gate.
 */
export async function getCurrentTier(): Promise<Tier> {
  const [user] = await db
    .select({ tier: usersTable.tier })
    .from(usersTable)
    .where(eq(usersTable.id, CURRENT_USER_ID));
  return (user?.tier ?? "free") as Tier;
}

export const FREE_HABIT_LIMIT = 3;

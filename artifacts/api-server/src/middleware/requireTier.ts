import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  getEffectiveMembershipTier,
  membershipTierMeetsRequirement,
  normalizeMembershipTier,
  type MembershipTier,
} from "../lib/revenueCatMembership";

export type Tier = MembershipTier;

export function hasRequiredTier(currentTier: string, minTier: Tier): boolean {
  return membershipTierMeetsRequirement(
    normalizeMembershipTier(currentTier),
    minTier,
  );
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
      .select({ clerkId: usersTable.clerkId, tier: usersTable.tier })
      .from(usersTable)
      .where(eq(usersTable.id, req.dbUser.id));

    const localTier = normalizeMembershipTier(user?.tier);
    let currentTier = localTier;

    if (!hasRequiredTier(localTier, minTier)) {
      try {
        currentTier = await getEffectiveMembershipTier(
          localTier,
          user?.clerkId,
          minTier,
        );
      } catch (error) {
        console.error("RevenueCat membership check failed", error);
        res.status(503).json({
          error: "membership_check_unavailable",
          message: "Membership access could not be verified. Please try again.",
        });
        return;
      }
    }

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
export async function getCurrentTier(
  userId: number,
  requiredTier?: Tier,
): Promise<Tier> {
  const [user] = await db
    .select({ clerkId: usersTable.clerkId, tier: usersTable.tier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return getEffectiveMembershipTier(
    user?.tier,
    user?.clerkId,
    requiredTier,
  );
}

export const FREE_HABIT_LIMIT = 3;

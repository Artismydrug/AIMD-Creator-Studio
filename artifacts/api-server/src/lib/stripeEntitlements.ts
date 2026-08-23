import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { normalizeMembershipTier, type MembershipTier } from "./revenueCatMembership";
import { logger } from "./logger";

/** Paid tiers a Stripe subscription can grant. */
export type PaidTier = "academy" | "pro";

export function parsePaidTier(value: unknown): PaidTier | null {
  return value === "academy" || value === "pro" ? value : null;
}

const TIER_RANK: Record<string, number> = { free: 0, workshop: 1, academy: 1, pro: 2 };

function rankOf(tier: MembershipTier): number {
  return TIER_RANK[tier] ?? 0;
}

/**
 * SQL expression ranking the CURRENT stored tier, so tier writes can be made
 * conditional in a single atomic statement (no read-modify-write races
 * between concurrent webhook/verify events).
 */
const currentTierRankSql = sql`(CASE ${usersTable.tier}
  WHEN 'pro' THEN 2
  WHEN 'academy' THEN 1
  WHEN 'workshop' THEN 1
  ELSE 0 END)`;

/** Minimal shape of a Stripe Checkout Session we rely on. */
export type CheckoutSessionLike = {
  id: string;
  payment_status?: string | null;
  client_reference_id?: string | null;
  customer?: string | { id: string } | null;
  subscription?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

export type GrantResult =
  | { granted: true; tier: PaidTier; userId: number }
  | { granted: false; reason: string };

export type GrantOptions = {
  /**
   * Returns the CURRENT status of a Stripe subscription (e.g. "active",
   * "canceled"). Defaults to a live Stripe lookup; injectable for tests.
   */
  getSubscriptionStatus?: (subscriptionId: string) => Promise<string>;
};

async function fetchSubscriptionStatus(subscriptionId: string): Promise<string> {
  const stripe = await getUncachableStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription.status;
}

/**
 * Grants a membership tier from a COMPLETED subscription checkout session.
 *
 * Trust model: callers must only pass sessions obtained from Stripe itself —
 * either a signature-verified webhook event or a server-side
 * `checkout.sessions.retrieve` — never client-supplied session data.
 *
 * Safety properties:
 * - Idempotent: replaying the same event is a no-op once the tier is granted.
 * - Never downgrades: the tier write is rank-conditional in SQL, so a pro
 *   user completing an academy checkout keeps pro even under concurrency.
 * - Replay-proof: the session's subscription must STILL be active/trialing at
 *   grant time, so a delayed replay of an old completed checkout cannot
 *   re-grant a tier after that subscription was cancelled.
 */
export async function grantTierFromCheckoutSession(
  session: CheckoutSessionLike,
  opts: GrantOptions = {},
): Promise<GrantResult> {
  if (session.metadata?.type !== "subscription_upgrade") {
    return { granted: false, reason: "not_a_subscription_upgrade_session" };
  }
  if (session.payment_status !== "paid") {
    return { granted: false, reason: "payment_not_completed" };
  }
  const tier = parsePaidTier(session.metadata?.tier);
  const userId = Number(session.client_reference_id);
  if (!tier || !Number.isInteger(userId) || userId <= 0) {
    return { granted: false, reason: "missing_or_invalid_metadata" };
  }

  // Replay guard: the purchased subscription must still be live right now.
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (!subscriptionId) {
    return { granted: false, reason: "session_has_no_subscription" };
  }
  const getStatus = opts.getSubscriptionStatus ?? fetchSubscriptionStatus;
  let status: string;
  try {
    status = await getStatus(subscriptionId);
  } catch (err) {
    logger.error({ err, subscriptionId }, "Failed to verify subscription status");
    return { granted: false, reason: "subscription_status_unavailable" };
  }
  if (status !== "active" && status !== "trialing") {
    return { granted: false, reason: `subscription_not_active:${status}` };
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return { granted: false, reason: "user_not_found" };

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (customerId && user.stripeCustomerId !== customerId) {
    if (user.stripeCustomerId) {
      // Should not happen once checkout reuses the stored customer; log it so
      // a split-customer account is visible instead of silent.
      logger.warn(
        { userId, previous: user.stripeCustomerId, next: customerId },
        "User's Stripe customer id changed — possible split customer",
      );
    }
    await db
      .update(usersTable)
      .set({ stripeCustomerId: customerId })
      .where(eq(usersTable.id, userId));
  }

  // Atomic, rank-conditional upgrade: only applies when the purchased tier
  // outranks whatever is stored at write time.
  const upgraded = await db
    .update(usersTable)
    .set({ tier })
    .where(sql`${usersTable.id} = ${userId} AND ${currentTierRankSql} < ${rankOf(tier)}`)
    .returning({ id: usersTable.id });
  if (upgraded.length > 0) {
    logger.info({ userId, tier }, "Stripe checkout entitlement applied");
  }
  return { granted: true, tier, userId };
}

/**
 * Recomputes a user's tier after one of their Stripe subscriptions ends.
 *
 * Looks up the user's REMAINING active subscriptions in Stripe and keeps the
 * highest tier they still pay for (subscription metadata.tier, set at
 * checkout). Only Stripe-governed paid tiers are ever touched — a user whose
 * tier is "free" (or unknown vocabulary) is left alone. The downgrade itself
 * is rank-conditional in SQL so it cannot clobber a concurrent upgrade to a
 * tier the user still holds.
 */
export async function reconcileTierAfterSubscriptionEnd(
  customerId: string,
): Promise<void> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId));
  if (!user) return; // not a customer we created via web checkout

  const currentTier = normalizeMembershipTier(user.tier);
  if (currentTier === "free") return;

  const stripe = await getUncachableStripeClient();
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 100,
  });

  let remaining: MembershipTier = "free";
  for (const sub of subs.data) {
    const t = parsePaidTier(sub.metadata?.tier);
    if (t === "pro") remaining = "pro";
    else if (t === "academy" && remaining === "free") remaining = "academy";
  }

  // Atomic, rank-conditional downgrade: only lowers the tier if it still
  // outranks what the user's remaining subscriptions cover.
  const downgraded = await db
    .update(usersTable)
    .set({ tier: remaining })
    .where(sql`${usersTable.id} = ${user.id} AND ${currentTierRankSql} > ${rankOf(remaining)}`)
    .returning({ id: usersTable.id });
  if (downgraded.length > 0) {
    logger.info(
      { userId: user.id, from: currentTier, to: remaining },
      "Stripe subscription ended — tier reconciled",
    );
  }
}

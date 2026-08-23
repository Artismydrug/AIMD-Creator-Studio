import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import { grantTierFromCheckoutSession, parsePaidTier } from "./stripeEntitlements";

/**
 * Integration coverage for Stripe checkout entitlements: a completed,
 * signature-verified checkout session must grant the purchased tier to the
 * referenced user — and only then.
 */

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

let userId: number;

function sessionFor(overrides: Record<string, unknown> = {}) {
  return {
    id: `cs_test_${suffix}`,
    payment_status: "paid",
    client_reference_id: String(userId),
    customer: "cus_test_" + suffix,
    subscription: "sub_test_" + suffix,
    metadata: { type: "subscription_upgrade", tier: "academy", userId: String(userId) },
    ...overrides,
  };
}

/** Stubbed Stripe subscription-status lookup (no network). */
const activeSub = { getSubscriptionStatus: async () => "active" };
const canceledSub = { getSubscriptionStatus: async () => "canceled" };

beforeAll(async () => {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (email, username, is_admin, tier)
     VALUES ($1, $2, false, 'free') RETURNING id`,
    [`ent_${suffix}@example.test`, `ent_${suffix}`],
  );
  userId = rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
});

describe("parsePaidTier", () => {
  it("accepts only paid tiers", () => {
    expect(parsePaidTier("academy")).toBe("academy");
    expect(parsePaidTier("pro")).toBe("pro");
    expect(parsePaidTier("free")).toBeNull();
    expect(parsePaidTier("admin")).toBeNull();
    expect(parsePaidTier(undefined)).toBeNull();
  });
});

describe("grantTierFromCheckoutSession", () => {
  it("refuses sessions that are not subscription upgrades", async () => {
    const result = await grantTierFromCheckoutSession(
      sessionFor({ metadata: { type: "sponsorship" } }),
      activeSub,
    );
    expect(result.granted).toBe(false);
  });

  it("refuses unpaid sessions", async () => {
    const result = await grantTierFromCheckoutSession(
      sessionFor({ payment_status: "unpaid" }),
      activeSub,
    );
    expect(result.granted).toBe(false);

    const { rows } = await pool.query(`SELECT tier FROM users WHERE id = $1`, [userId]);
    expect(rows[0].tier).toBe("free");
  });

  it("refuses a tier outside the paid vocabulary (no privilege injection)", async () => {
    const result = await grantTierFromCheckoutSession(
      sessionFor({ metadata: { type: "subscription_upgrade", tier: "admin" } }),
      activeSub,
    );
    expect(result.granted).toBe(false);
  });

  it("refuses a session with no subscription attached", async () => {
    const result = await grantTierFromCheckoutSession(
      sessionFor({ subscription: null }),
      activeSub,
    );
    expect(result.granted).toBe(false);
  });

  it("refuses a replayed session whose subscription is no longer active", async () => {
    const result = await grantTierFromCheckoutSession(sessionFor(), canceledSub);
    expect(result.granted).toBe(false);

    const { rows } = await pool.query(`SELECT tier FROM users WHERE id = $1`, [userId]);
    expect(rows[0].tier).toBe("free");
  });

  it("grants the purchased tier and records the Stripe customer id", async () => {
    const result = await grantTierFromCheckoutSession(sessionFor(), activeSub);
    expect(result.granted).toBe(true);

    const { rows } = await pool.query(
      `SELECT tier, stripe_customer_id FROM users WHERE id = $1`,
      [userId],
    );
    expect(rows[0].tier).toBe("academy");
    expect(rows[0].stripe_customer_id).toBe("cus_test_" + suffix);
  });

  it("is idempotent on replay while the subscription is still active", async () => {
    const result = await grantTierFromCheckoutSession(sessionFor(), activeSub);
    expect(result.granted).toBe(true);
    const { rows } = await pool.query(`SELECT tier FROM users WHERE id = $1`, [userId]);
    expect(rows[0].tier).toBe("academy");
  });

  it("never downgrades an existing higher tier", async () => {
    await pool.query(`UPDATE users SET tier = 'pro' WHERE id = $1`, [userId]);
    const result = await grantTierFromCheckoutSession(sessionFor(), activeSub); // academy checkout
    expect(result.granted).toBe(true);
    const { rows } = await pool.query(`SELECT tier FROM users WHERE id = $1`, [userId]);
    expect(rows[0].tier).toBe("pro");
  });
});

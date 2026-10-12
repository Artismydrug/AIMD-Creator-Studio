import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { grantTierFromCheckoutSession } from "../lib/stripeEntitlements";
import { CreateCheckoutSessionBody } from "@workspace/api-zod";

const router = Router();
// The app is public in its free-launch phase. Paid checkout reopens only after
// the first filmed course releases and career-pipeline experience are ready.
const PAID_MEMBERSHIPS_COMING_SOON = true;

// ─── Plan registry ─────────────────────────────────────────────────────────────
//
// Plan names reflect the Creator Studio positioning:
//   Discovering Artist (free)     — start your creative practice
//   Dedicated Artist   ($39/mo, $399/yr) — full workshop & masterclass access
//   Professional Artist ($99/mo, $999/yr) — career pipeline + verified placement
//
// Legacy tiers "workshop" and "academy" are preserved via TIER_RANK in
// revenueCatMembership.ts (both rank equal to "academy").

const PLANS = [
  {
    id: "plan_free",
    stripeName: null,
    stripeNameAnnual: null,
    name: "Discovering Artist",
    tier: "free",
    priceMonthly: 0,
    priceAnnual: null as number | null,
    featured: false,
    description: "Free access for aspiring creators. Start your creative practice today.",
    features: [
      "Up to 3 active habits & basic focus timers",
      "Full Studio Feed — share work & message creators",
      "Module 1 + free previews across all Workshops & Masterclasses",
      "Community event access & RSVPs",
      "AIMD community Discord",
    ],
    limits: { habits: 3, workshopModules: 1 },
  },
  {
    id: "plan_academy",
    stripeName: "Dedicated Artist",
    stripeNameAnnual: "Dedicated Artist Annual",
    name: "Dedicated Artist",
    tier: "academy",
    priceMonthly: 39,
    priceAnnual: 399,
    featured: true,
    description: "Full access to AIMD's Workshops & Masterclasses curriculum.",
    features: [
      "Unlimited habits, visual heatmaps & session analytics",
      "All workshop & masterclass videos, modules & content",
      "Assignment submission & instructor feedback",
      "Milestone badges & certification path",
      "Priority event access",
      "Studio placement job board",
    ],
    limits: { habits: null, workshopModules: null },
  },
  {
    id: "plan_pro",
    stripeName: "Professional Artist",
    stripeNameAnnual: "Professional Artist Annual",
    name: "Professional Artist",
    tier: "pro",
    priceMonthly: 99,
    priceAnnual: 999,
    featured: false,
    description: "The complete AIMD career pipeline. All Dedicated Artist features plus verified placement.",
    features: [
      "Everything in Dedicated Artist",
      "Studio Ready™ verified artist badge",
      "Priority chair & booth placement queue",
      "Public Guild Client Booking Directory listing",
      "Portfolio Development Pro workshop",
      "1:1 career coaching session per month",
      "Partner studio introductions",
    ],
    limits: { habits: null, workshopModules: null },
  },
];

// ─── GET /payments/plans ──────────────────────────────────────────────────────

router.get("/plans", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.name    AS product_name,
        pr.id     AS price_id,
        pr.unit_amount,
        pr.recurring->>'interval' AS billing_interval
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
    `);

    // Build lookup: productName → { monthly, annual }
    const pricesByProduct: Record<string, { monthly?: string; annual?: string }> = {};
    for (const row of result.rows as any[]) {
      const name = row.product_name as string;
      if (!pricesByProduct[name]) pricesByProduct[name] = {};
      if (row.billing_interval === "year") {
        pricesByProduct[name].annual = row.price_id;
      } else {
        pricesByProduct[name].monthly = row.price_id;
      }
    }

    const enriched = PLANS.map((plan) => ({
      ...plan,
      priceId:       plan.stripeName        ? (pricesByProduct[plan.stripeName]?.monthly ?? null)              : null,
      priceIdAnnual: plan.stripeNameAnnual  ? (pricesByProduct[plan.stripeNameAnnual]?.annual ?? null)         : null,
    }));

    res.json(enriched);
  } catch {
    res.json(PLANS.map((p) => ({ ...p, priceId: null, priceIdAnnual: null })));
  }
});

// ─── POST /payments/create-checkout-session ───────────────────────────────────

router.post("/create-checkout-session", async (req, res): Promise<void> => {
  try {
    // Checkout must be tied to a signed-in user so the completed payment can
    // grant their membership tier (via webhook + verify-session).
    if (!req.dbUser) {
      res.status(401).json({ error: "Sign in to subscribe." });
      return;
    }
    const { planId, billing = "monthly", successUrl, cancelUrl } = req.body as {
      planId: string;
      billing?: "monthly" | "annual";
      successUrl?: string;
      cancelUrl?: string;
    };
    const body = { planId, billing: billing as "monthly" | "annual", successUrl, cancelUrl };
    const plan = PLANS.find((p) => p.id === body.planId);
    if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

    if (plan.priceMonthly === 0) {
      res.json({ sessionId: null, checkoutUrl: null, message: "Discovering Artist plan is free — no checkout needed." });
      return;
    }
    if (PAID_MEMBERSHIPS_COMING_SOON) {
      res.status(503).json({
        error: "paid_memberships_coming_soon",
        message: "Dedicated Artist and Professional Artist memberships are coming soon.",
      });
      return;
    }

    const useAnnual = body.billing === "annual" && plan.priceAnnual && plan.stripeNameAnnual;
    const lookupName = useAnnual ? plan.stripeNameAnnual : plan.stripeName;

    const result = await db.execute(sql`
      SELECT pr.id AS price_id
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.name = ${lookupName} AND p.active = true
      LIMIT 1
    `);

    const priceId = (result.rows[0] as any)?.price_id;
    if (!priceId) {
      res.status(503).json({ error: "Stripe price not found. Ensure products are seeded." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const entitlementMetadata = {
      type: "subscription_upgrade",
      userId: String(req.dbUser.id),
      tier: plan.tier,
      planId: plan.id,
      billing: useAnnual ? "annual" : "monthly",
    };

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      // Note: payment_method_types is intentionally omitted — this Stripe
      // account uses Managed Payments, which rejects that parameter.
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      // Ties the session (and resulting subscription) back to our user so the
      // webhook / verify-session flow can grant + reconcile the tier.
      client_reference_id: String(req.dbUser.id),
      metadata: entitlementMetadata,
      subscription_data: { metadata: entitlementMetadata },
      // The web app is mounted at the root path (BASE_PATH=/) in both dev and
      // production, so redirect paths must not include an artifact prefix.
      success_url:
        body.successUrl ??
        `${baseUrl}/plans?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl ?? `${baseUrl}/plans?canceled=1`,
    };

    // Keep one Stripe customer per user: reuse the stored customer so all
    // subscriptions live under a single customer and cancellation reconciles
    // across every subscription. Fall back to email for the first purchase.
    if (req.dbUser.stripeCustomerId) {
      sessionParams.customer = req.dbUser.stripeCustomerId;
    } else if (req.dbUser.email) {
      sessionParams.customer_email = req.dbUser.email;
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (err: any) {
      // A stale/deleted stored customer must not block checkout — retry once
      // letting Stripe create a fresh customer (grant will re-save the id).
      if (sessionParams.customer && /No such customer/i.test(err?.message ?? "")) {
        delete sessionParams.customer;
        if (req.dbUser.email) sessionParams.customer_email = req.dbUser.email;
        session = await stripe.checkout.sessions.create(sessionParams);
      } else {
        throw err;
      }
    }

    res.json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? String(err) });
  }
});

// ─── POST /payments/verify-checkout-session ───────────────────────────────────
// Fallback for the success redirect: verifies the session directly with Stripe
// and applies the tier immediately (webhook delivery may lag or be unavailable
// in development). Safe: the session is retrieved server-side from Stripe and
// must belong to the signed-in user.

router.post("/verify-checkout-session", async (req, res): Promise<void> => {
  try {
    if (!req.dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      res.status(400).json({ error: "A valid sessionId is required." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.client_reference_id !== String(req.dbUser.id)) {
      res.status(403).json({ error: "This checkout session belongs to another account." });
      return;
    }

    const result = await grantTierFromCheckoutSession(session);
    if (!result.granted) {
      res.status(402).json({ error: "payment_not_completed", reason: result.reason });
      return;
    }
    res.json({ tier: result.tier });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? String(err) });
  }
});

// ─── POST /payments/create-sponsor-checkout ───────────────────────────────────
// Creates a one-time Stripe Checkout for $39 or $99 creator sponsorships.

router.post("/create-sponsor-checkout", async (req, res): Promise<void> => {
  try {
    const { amount, creatorName, message } = req.body as { amount: string; creatorName?: string; message?: string };
    if (!["39", "99"].includes(amount)) {
      res.status(400).json({ error: "Invalid amount. Must be '39' or '99'." });
      return;
    }
    const body = { amount, creatorName, message };
    const stripe = await getUncachableStripeClient();
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const amountCents = Number(amount) * 100;
    const tierLabel   = body.amount === "39" ? "Dedicated Artist" : "Professional Artist";
    const desc        = body.creatorName
      ? `AIMD Sponsorship — ${tierLabel} for ${body.creatorName}`
      : `AIMD Sponsorship — ${tierLabel}`;

    const session = await stripe.checkout.sessions.create({
      // payment_method_types omitted — Managed Payments handles it.
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency:     "usd",
            unit_amount:  amountCents,
            product_data: {
              name:        desc,
              description: body.message ?? `Sponsor a deserving creator's ${tierLabel} membership for one month.`,
              // Managed Payments requires a product tax code.
              // Electronically supplied services — digital membership access.
              tax_code:    "txcd_10000000",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/sponsor?sponsor_success=1`,
      cancel_url:  `${baseUrl}/sponsor`,
      metadata: {
        type:        "sponsorship",
        tierLabel,
        creatorName: body.creatorName ?? "",
        message:     body.message ?? "",
      },
    });

    res.json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? String(err) });
  }
});

export default router;

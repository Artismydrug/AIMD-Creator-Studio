import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { CreateCheckoutSessionBody } from "@workspace/api-zod";

const router = Router();

// ─── Plan registry ─────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "plan_free",
    stripeName: null,
    stripeNameAnnual: null,
    name: "Studio Starter Pass",
    tier: "free",
    priceMonthly: 0,
    priceAnnual: null as number | null,
    featured: false,
    description: "Free access for youth creators and community members. Start your creative practice today.",
    features: [
      "Up to 3 active habits & basic focus timers",
      "Full Studio Feed — post, like & comment",
      "Module 1 + free previews across all workshops",
      "Community event access & RSVPs",
      "AIMD community Discord",
    ],
    limits: { habits: 3, workshopModules: 1 },
  },
  {
    id: "plan_academy",
    stripeName: "Workshop Academy",
    stripeNameAnnual: "Academy Pass Annual",
    name: "Academy Pass",
    tier: "academy",
    priceMonthly: 39,
    priceAnnual: 399,
    featured: true,
    description: "Full access to AIMD's structured workshop and apprenticeship curriculum.",
    features: [
      "Unlimited habits, visual heatmaps & session analytics",
      "All workshop videos, course modules & content",
      "Assignment submission & instructor feedback",
      "Milestone badges & certification path",
      "Priority event access",
      "Studio placement job board",
    ],
    limits: { habits: null, workshopModules: null },
  },
  {
    id: "plan_pro",
    stripeName: "Pro Studio",
    stripeNameAnnual: null,
    name: "Pro / Career",
    tier: "pro",
    priceMonthly: 99,
    priceAnnual: null as number | null,
    featured: false,
    description: "The complete AIMD career pipeline. All Academy features plus verified placement.",
    features: [
      "Everything in Academy Pass",
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
      res.json({ sessionId: null, checkoutUrl: null, message: "Studio Starter Pass is free — no checkout needed." });
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: body.successUrl ?? `${baseUrl}/aimd-academy/plans?success=1`,
      cancel_url:  body.cancelUrl  ?? `${baseUrl}/aimd-academy/plans?canceled=1`,
    });

    res.json({ sessionId: session.id, checkoutUrl: session.url });
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
    const tierLabel   = body.amount === "39" ? "Academy Pass" : "Pro / Career";
    const desc        = body.creatorName
      ? `AIMD Sponsorship — ${tierLabel} for ${body.creatorName}`
      : `AIMD Sponsorship — ${tierLabel}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency:     "usd",
            unit_amount:  amountCents,
            product_data: {
              name:        desc,
              description: body.message ?? `Sponsor a deserving creator's ${tierLabel} membership for one month. Tax-deductible 501(c)(3) donation.`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/aimd-academy/sponsor?sponsor_success=1`,
      cancel_url:  `${baseUrl}/aimd-academy/sponsor`,
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

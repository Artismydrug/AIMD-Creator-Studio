/**
 * AIMD Academy — Stripe product seeder
 *
 * Creates the Workshop Academy ($39/mo) and Pro Studio ($99/mo) subscription
 * products in Stripe. Idempotent — safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */

import Stripe from 'stripe';

async function getStripeCredentials(): Promise<{ secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Missing Replit environment variables. Ensure the Stripe integration is connected.');
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) throw new Error(`Failed to fetch Stripe credentials: ${resp.status}`);

  const data = await resp.json();
  const secretKey = data.items?.[0]?.settings?.secret;
  if (!secretKey) throw new Error('Stripe secret key not found in connection settings.');

  return { secretKey };
}

async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

const PRODUCTS = [
  {
    name: 'Workshop Academy',
    description: 'Full access to AIMD\'s structured workshop and apprenticeship curriculum.',
    unitAmount: 3900,    // $39.00
    metadata: { tier: 'academy', plan_id: 'plan_academy' },
  },
  {
    name: 'Pro Studio',
    description: 'The complete AIMD career pipeline for serious creators going professional.',
    unitAmount: 9900,    // $99.00
    metadata: { tier: 'pro', plan_id: 'plan_pro' },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  for (const product of PRODUCTS) {
    // Check if already exists
    const existing = await stripe.products.search({
      query: `name:'${product.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ "${product.name}" already exists (${existing.data[0].id})`);

      // Show its prices
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      for (const p of prices.data) {
        console.log(`  price: ${p.id} — $${(p.unit_amount ?? 0) / 100}/${p.recurring?.interval}`);
      }
      continue;
    }

    const created = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });
    console.log(`✓ Created product: "${created.name}" (${created.id})`);

    const price = await stripe.prices.create({
      product: created.id,
      unit_amount: product.unitAmount,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`  price: ${price.id} — $${product.unitAmount / 100}/month`);
  }

  console.log('\n✅ Done. Webhooks will sync these products to your database automatically.');
}

seedProducts().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

/**
 * AIMD Creator Studio — Stripe product seeder
 *
 * Idempotently creates subscription products for:
 *   - Dedicated Artist     $39/mo monthly  (legacy name: Workshop Academy)
 *   - Dedicated Artist Annual $399/yr
 *   - Professional Artist  $99/mo monthly  (legacy name: Pro Studio)
 *   - Professional Artist Annual $999/yr   (NEW: aimd_pro_annual)
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

  const data = await resp.json() as {
    items?: Array<{ settings?: { secret?: string } }>;
  };
  const secretKey = data.items?.[0]?.settings?.secret;
  if (!secretKey) throw new Error('Stripe secret key not found in connection settings.');

  return { secretKey };
}

async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

/**
 * Each entry describes a product + one price.
 * Rename fields: if oldName is set and a product with that name exists and no
 * product with `name` exists, the old product is used and its display name is
 * updated. This preserves existing Stripe product IDs.
 */
type ProductSpec = {
  name: string;
  oldName: string | null;
  description: string;
  unitAmount: number;
  interval: 'month' | 'year';
  metadata: Record<string, string>;
};

// Managed Payments (enabled on this Stripe account) requires every product to
// carry a tax code. Memberships are electronically supplied services.
const MEMBERSHIP_TAX_CODE = 'txcd_10000000';

const PRODUCTS: ProductSpec[] = [
  // ── Dedicated Artist (formerly Workshop Academy) ─────────────────────────
  {
    name: 'Dedicated Artist',
    oldName: 'Workshop Academy',          // preserve existing Stripe product
    description: 'Full access to AIMD\'s Workshops & Masterclasses curriculum.',
    unitAmount: 3900,                     // $39.00/month
    interval: 'month',
    metadata: { tier: 'academy', plan_id: 'plan_academy' },
  },
  {
    name: 'Dedicated Artist Annual',
    oldName: 'Academy Pass Annual',       // preserve existing Stripe product
    description: 'Dedicated Artist plan billed annually — save vs monthly.',
    unitAmount: 39900,                    // $399.00/year
    interval: 'year',
    metadata: { tier: 'academy', plan_id: 'plan_academy', billing: 'annual' },
  },
  // ── Professional Artist (formerly Pro Studio) ─────────────────────────────
  {
    name: 'Professional Artist',
    oldName: 'Pro Studio',                // preserve existing Stripe product
    description: 'The complete AIMD career pipeline for serious creators.',
    unitAmount: 9900,                     // $99.00/month
    interval: 'month',
    metadata: { tier: 'pro', plan_id: 'plan_pro' },
  },
  {
    name: 'Professional Artist Annual',
    oldName: null,                        // brand-new product
    description: 'Professional Artist plan billed annually — save vs monthly.',
    unitAmount: 99900,                    // $999.00/year
    interval: 'year',
    metadata: { tier: 'pro', plan_id: 'plan_pro', billing: 'annual', lookup_key: 'aimd_pro_annual' },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  // Stripe search matches loosely (and its index lags), so never trust
  // search results directly — list all active products once and match names
  // exactly.
  const allProducts: Stripe.Product[] = [];
  for await (const p of stripe.products.list({ active: true, limit: 100 })) {
    allProducts.push(p);
  }

  for (const product of PRODUCTS) {
    // 1. Look for existing product by canonical name (exact match)
    let existing = allProducts.find((p) => p.name === product.name);

    // 2. Fallback: look by legacy name (idempotent rename path)
    if (!existing && product.oldName) {
      const legacyExact = allProducts.find((p) => p.name === product.oldName);
      if (legacyExact) {
        existing = legacyExact;
        // Rename the product to the new canonical name
        await stripe.products.update(existing.id, {
          name: product.name,
          metadata: product.metadata,
          tax_code: MEMBERSHIP_TAX_CODE,
        });
        console.log(`✓ Renamed "${product.oldName}" → "${product.name}" (${existing.id})`);
      }
    }

    if (existing) {
      console.log(`✓ "${product.name}" already exists (${existing.id})`);

      // Managed Payments requires a tax code on every product sold.
      if (existing.tax_code !== MEMBERSHIP_TAX_CODE) {
        await stripe.products.update(existing.id, { tax_code: MEMBERSHIP_TAX_CODE });
        console.log(`  + Set tax code ${MEMBERSHIP_TAX_CODE}`);
      }

      // Show its prices
      const prices = await stripe.prices.list({ product: existing.id, active: true });
      for (const p of prices.data) {
        console.log(`  price: ${p.id} — $${(p.unit_amount ?? 0) / 100}/${p.recurring?.interval}`);
      }

      // Ensure the correct price exists for this product/interval pair
      const hasCorrectPrice = prices.data.some(
        (p) =>
          p.unit_amount === product.unitAmount &&
          p.recurring?.interval === product.interval,
      );
      if (!hasCorrectPrice) {
        const price = await stripe.prices.create({
          product: existing.id,
          unit_amount: product.unitAmount,
          currency: 'usd',
          recurring: { interval: product.interval },
          metadata: product.metadata,
        });
        console.log(`  + Added missing price: ${price.id} — $${product.unitAmount / 100}/${product.interval}`);
      }
      continue;
    }

    // 3. Create brand-new product + price
    const created = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
      tax_code: MEMBERSHIP_TAX_CODE,
    });
    console.log(`✓ Created product: "${created.name}" (${created.id})`);

    const price = await stripe.prices.create({
      product: created.id,
      unit_amount: product.unitAmount,
      currency: 'usd',
      recurring: { interval: product.interval },
      metadata: product.metadata,
    });
    console.log(`  price: ${price.id} — $${product.unitAmount / 100}/${product.interval}`);
  }

  console.log('\n✅ Done. Webhooks will sync these products to your database automatically.');
}

seedProducts().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

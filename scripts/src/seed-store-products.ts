/**
 * AIMD native storefront — Stripe retail catalog seeder.
 *
 * Idempotent: updates matching active products and only creates a price when
 * the product does not already have an active one-time price at that amount.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-store-products.ts
 */

import Stripe from "stripe";

type StoreProductDefinition = {
  name: string;
  description: string;
  unitAmount: number;
  metadata: Record<string, string>;
};

const STORE_PRODUCTS: StoreProductDefinition[] = [
  {
    name: "AIMD Signature Art Is My Drug Tee",
    description: "The original AIMD signature tee. Every purchase helps place art supplies in the hands of a young creator.",
    unitAmount: 2000,
    metadata: {
      catalog: "aimd_store",
      category: "apparel",
      image_key: "signature-tee",
      fulfillment_type: "physical",
      featured: "true",
      inventory_label: "Give Back Initiative",
    },
  },
  {
    name: "Art Is My Drug Vision Graphic Tee",
    description: "A bold wearable statement built around AIMD’s original vision graphic.",
    unitAmount: 4000,
    metadata: {
      catalog: "aimd_store",
      category: "apparel",
      image_key: "vision-tee",
      fulfillment_type: "physical",
      featured: "false",
      inventory_label: "Pre-order",
    },
  },
  {
    name: "Freestyle Signature Pattern Handcrafted Piece",
    description: "A one-of-one handcrafted signature artwork created for collectors who believe in the movement.",
    unitAmount: 100000,
    metadata: {
      catalog: "aimd_store",
      category: "canvas",
      image_key: "freestyle-original",
      fulfillment_type: "physical",
      featured: "true",
      inventory_label: "Limited Edition",
    },
  },
  {
    name: "Split Smile Coloring Book",
    description: "Smile Through It All — an expressive coloring book for making space, finding focus, and creating through the hard days.",
    unitAmount: 2000,
    metadata: {
      catalog: "aimd_store",
      category: "canvas",
      image_key: "split-smile-book",
      fulfillment_type: "physical",
      featured: "false",
      inventory_label: "In Stock",
    },
  },
  {
    name: "Create. Connect. Transform. Canvas Print",
    description: "A gallery-ready canvas print celebrating the three words at the center of the AIMD creator journey.",
    unitAmount: 8500,
    metadata: {
      catalog: "aimd_store",
      category: "canvas",
      image_key: "transform-canvas",
      fulfillment_type: "physical",
      featured: "false",
      inventory_label: "Made to Order",
    },
  },
  {
    name: "AIMD Digital Flash Collection — Volume 1",
    description: "A downloadable collection of original AIMD-inspired flash art and creative prompts for personal practice.",
    unitAmount: 1800,
    metadata: {
      catalog: "aimd_store",
      category: "digital",
      image_key: "digital-flash",
      fulfillment_type: "digital",
      featured: "false",
      inventory_label: "Instant Download",
    },
  },
];

async function getStripeClient(): Promise<Stripe> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Run this script from a Replit workflow with the Stripe integration attached.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.status}`);
  }

  const payload = await response.json() as {
    items?: Array<{ settings?: { secret?: string } }>;
  };
  const secretKey = payload.items?.[0]?.settings?.secret;
  if (!secretKey) {
    throw new Error("Stripe secret key not found in the attached integration.");
  }
  return new Stripe(secretKey);
}

async function seedStoreProducts(): Promise<void> {
  const stripe = await getStripeClient();

  for (const definition of STORE_PRODUCTS) {
    const existing = await stripe.products.search({
      query: `name:'${definition.name.replaceAll("'", "\\'")}' AND active:'true'`,
    });
    const product = existing.data[0]
      ? await stripe.products.update(existing.data[0].id, {
          description: definition.description,
          metadata: definition.metadata,
          shippable: definition.metadata.fulfillment_type === "physical",
        })
      : await stripe.products.create({
          name: definition.name,
          description: definition.description,
          metadata: definition.metadata,
          shippable: definition.metadata.fulfillment_type === "physical",
        });

    const prices = await stripe.prices.list({ product: product.id, active: true });
    const price = prices.data.find((candidate) =>
      candidate.type === "one_time"
      && candidate.unit_amount === definition.unitAmount
      && candidate.currency === "usd"
    ) ?? await stripe.prices.create({
      product: product.id,
      unit_amount: definition.unitAmount,
      currency: "usd",
    });

    console.log(`✓ ${product.name}: ${price.id}`);
  }

  console.log("AIMD storefront catalog is ready. Stripe webhooks will sync it to PostgreSQL.");
}

seedStoreProducts().catch((error: unknown) => {
  console.error("Store catalog seed failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
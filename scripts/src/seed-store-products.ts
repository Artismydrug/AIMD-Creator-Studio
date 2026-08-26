/**
 * AIMD native storefront — Stripe retail catalog synchronizer.
 *
 * The source of truth is store-catalog.ts. It updates matching active
 * products, keeps one active one-time USD price per product, and explicitly
 * marks products without a public Gallery page as unpublished.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run seed:store
 */

import { getStripeClient } from "./stripe-store-client";
import {
  getStoreMetadata,
  STORE_PRODUCTS,
  validateStoreCatalog,
} from "./store-catalog";

async function seedStoreProducts(): Promise<void> {
  const catalogErrors = validateStoreCatalog();
  if (catalogErrors.length) {
    throw new Error(`Store catalog is invalid:\n- ${catalogErrors.join("\n- ")}`);
  }

  const stripe = await getStripeClient();

  for (const definition of STORE_PRODUCTS) {
    const existingByKey = await stripe.products.search({
      query: `metadata['catalog_key']:'${definition.catalogKey}' AND active:'true'`,
    });
    // The first sync upgrades the original name-matched catalog entries,
    // which were created before catalog_key was introduced.
    const existing = existingByKey.data[0] ?? (await stripe.products.search({
      query: `name:'${definition.name.replaceAll("'", "\\'")}' AND active:'true'`,
    })).data[0];
    const product = existing
      ? await stripe.products.update(existing.id, {
          name: definition.name,
          description: definition.description,
          metadata: getStoreMetadata(definition),
          shippable: definition.fulfillmentType === "physical",
        })
      : await stripe.products.create({
          name: definition.name,
          description: definition.description,
          metadata: getStoreMetadata(definition),
          shippable: definition.fulfillmentType === "physical",
        });

    const prices = await stripe.prices.list({ product: product.id, active: true });
    const matchingPrice = prices.data.find((candidate) =>
      candidate.type === "one_time"
      && candidate.unit_amount === definition.unitAmount
      && candidate.currency === "usd"
    ) ?? await stripe.prices.create({
      product: product.id,
      unit_amount: definition.unitAmount,
      currency: "usd",
    });

    await Promise.all(
      prices.data
        .filter((candidate) => candidate.type === "one_time" && candidate.id !== matchingPrice.id)
        .map((candidate) => stripe.prices.update(candidate.id, { active: false })),
    );

    console.log(`${definition.galleryPublished ? "✓ Published" : "• Unpublished"} ${product.name}: ${matchingPrice.id}`);
  }

  console.log("AIMD storefront catalog is synchronized. Stripe webhooks will sync it to PostgreSQL.");
}

seedStoreProducts().catch((error: unknown) => {
  console.error("Store catalog sync failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

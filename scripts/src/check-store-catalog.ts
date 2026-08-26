/**
 * Verifies that the live Stripe AIMD catalog matches store-catalog.ts.
 *
 * This is intentionally a failing check rather than a repair: run seed:store
 * after reviewing the source catalog, then run check:store again.
 */

import type Stripe from "stripe";
import { getStripeClient } from "./stripe-store-client";
import {
  getStoreMetadata,
  STORE_PRODUCTS,
  validateStoreCatalog,
} from "./store-catalog";

async function listActiveAimdProducts(stripe: Stripe): Promise<Stripe.Product[]> {
  const products: Stripe.Product[] = [];
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata.catalog === "aimd_store") products.push(product);
  }
  return products;
}

async function checkStoreCatalog(): Promise<void> {
  const errors = validateStoreCatalog();
  if (errors.length) {
    throw new Error(`Store catalog is invalid:\n- ${errors.join("\n- ")}`);
  }

  const stripe = await getStripeClient();
  const liveProducts = await listActiveAimdProducts(stripe);
  const expectedByKey = new Map(STORE_PRODUCTS.map((definition) => [definition.catalogKey, definition]));
  const liveByKey = new Map<string, Stripe.Product>();

  for (const product of liveProducts) {
    const key = product.metadata.catalog_key;
    if (!key) {
      errors.push(`Live product ${product.id} is missing metadata.catalog_key.`);
      continue;
    }
    if (liveByKey.has(key)) {
      errors.push(`Multiple active Stripe products use catalog key ${key}.`);
      continue;
    }
    liveByKey.set(key, product);

    const definition = expectedByKey.get(key);
    if (!definition) {
      errors.push(`Live product ${product.id} (${key}) is not in store-catalog.ts.`);
      continue;
    }

    const expectedMetadata = getStoreMetadata(definition);
    for (const [field, expected] of Object.entries(expectedMetadata)) {
      if (product.metadata[field] !== expected) {
        errors.push(`${key}: metadata.${field} is ${JSON.stringify(product.metadata[field])}, expected ${JSON.stringify(expected)}.`);
      }
    }
    if (product.name !== definition.name) errors.push(`${key}: live name does not match the source catalog.`);
    if (product.description !== definition.description) errors.push(`${key}: live description does not match the source catalog.`);

    const prices = await stripe.prices.list({ product: product.id, active: true });
    const activeOneTimePrices = prices.data.filter((price) => price.type === "one_time");
    const matchingPrices = activeOneTimePrices.filter((price) =>
      price.currency === "usd" && price.unit_amount === definition.unitAmount,
    );
    if (matchingPrices.length !== 1) {
      errors.push(`${key}: expected exactly one active USD price at ${definition.unitAmount} cents, found ${matchingPrices.length}.`);
    }
    if (activeOneTimePrices.length !== 1) {
      errors.push(`${key}: expected exactly one active one-time price, found ${activeOneTimePrices.length}.`);
    }
  }

  for (const definition of STORE_PRODUCTS) {
    if (!liveByKey.has(definition.catalogKey)) {
      errors.push(`${definition.catalogKey}: source catalog entry has no matching active Stripe product.`);
    }
  }

  if (errors.length) {
    throw new Error(`Store catalog drift detected:\n- ${errors.join("\n- ")}`);
  }
  console.log(`Store catalog is in sync (${STORE_PRODUCTS.length} products checked).`);
}

checkStoreCatalog().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
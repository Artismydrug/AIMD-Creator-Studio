/**
 * One-off repair after seed-products.ts mis-matched via loose Stripe search:
 *  - set the Managed Payments tax code on the renamed MONTHLY products
 *  - deactivate the stray monthly prices added to the ANNUAL products
 *  - verify every membership product/price pairing, then create + expire a
 *    test subscription checkout session to prove Managed Payments accepts it.
 */
import Stripe from 'stripe';

async function getStripeClient(): Promise<Stripe> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;
  if (!hostname || !xReplitToken) throw new Error('Missing Replit connector env');
  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken } },
  );
  const data = (await resp.json()) as { items?: Array<{ settings?: { secret?: string } }> };
  const secret = data.items?.[0]?.settings?.secret;
  if (!secret) throw new Error('Stripe secret not found');
  return new Stripe(secret);
}

const TAX_CODE = 'txcd_10000000';

async function main() {
  const stripe = await getStripeClient();

  // The four membership products, by id (from seeding logs — verified below).
  const expectations: Array<{ id: string; name: string; interval: 'month' | 'year'; amount: number }> = [
    { id: 'prod_V32cjUdlWqfYla', name: 'Dedicated Artist', interval: 'month', amount: 3900 },
    { id: 'prod_V7umIdbW6miV69', name: 'Dedicated Artist Annual', interval: 'year', amount: 39900 },
    { id: 'prod_V32cjyTqonRdt6', name: 'Professional Artist', interval: 'month', amount: 9900 },
    { id: 'prod_V7umNn3pPfLTr0', name: 'Professional Artist Annual', interval: 'year', amount: 99900 },
  ];

  for (const exp of expectations) {
    const product = await stripe.products.retrieve(exp.id);
    if (product.name !== exp.name) {
      throw new Error(`Product ${exp.id} is "${product.name}", expected "${exp.name}" — aborting.`);
    }
    if (product.tax_code !== TAX_CODE) {
      await stripe.products.update(exp.id, { tax_code: TAX_CODE });
      console.log(`✓ Set tax code on "${exp.name}"`);
    } else {
      console.log(`✓ "${exp.name}" already has tax code`);
    }

    // Deactivate any active price that doesn't match this product's expected
    // interval/amount (the stray monthly prices on the annual products).
    const prices = await stripe.prices.list({ product: exp.id, active: true, limit: 100 });
    for (const price of prices.data) {
      const ok = price.recurring?.interval === exp.interval && price.unit_amount === exp.amount;
      if (!ok) {
        await stripe.prices.update(price.id, { active: false });
        console.log(`  − Deactivated stray price ${price.id} ($${(price.unit_amount ?? 0) / 100}/${price.recurring?.interval}) on "${exp.name}"`);
      } else {
        console.log(`  price OK: ${price.id} — $${(price.unit_amount ?? 0) / 100}/${price.recurring?.interval}`);
      }
    }
  }

  // Prove Managed Payments accepts a real subscription checkout session.
  const monthlyPrices = await stripe.prices.list({ product: 'prod_V32cjUdlWqfYla', active: true, limit: 1 });
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: monthlyPrices.data[0].id, quantity: 1 }],
    mode: 'subscription',
    client_reference_id: '0',
    metadata: { type: 'launch_smoke_test' },
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });
  console.log(`✓ Test subscription checkout session created: ${session.id}`);
  await stripe.checkout.sessions.expire(session.id);
  console.log('✓ Test session expired (cleanup)');
}

main().catch((err) => {
  console.error('Fix failed:', err.message);
  process.exit(1);
});

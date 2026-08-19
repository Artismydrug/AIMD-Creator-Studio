import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  storeOrderItemsTable,
  storeOrdersTable,
  type StoreOrder,
  type StoreOrderItem,
} from "@workspace/db";
import {
  CreateStorePaymentIntentBody,
  CreateStorePaymentIntentResponse,
  GetStoreOrderParams,
  GetStoreOrderResponse,
  ListMyStoreOrdersResponse,
  ListStoreProductsResponse,
} from "@workspace/api-zod";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();
const STANDARD_SHIPPING_CENTS = 750;
const FREE_SHIPPING_THRESHOLD_CENTS = 7_500;
const MAX_ORDER_CENTS = 2_000_000;
const STORE_CHECKOUT_ENABLED = process.env.STORE_CHECKOUT_ENABLED === "true";

type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  category: "apparel" | "canvas" | "digital";
  imageKey: string;
  fulfillmentType: "physical" | "digital";
  featured: boolean;
  inventoryLabel: string;
  priceId: string;
  unitAmount: number;
  currency: string;
};

function mapCatalogRow(row: Record<string, unknown>): CatalogProduct {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    category: String(row.category) as CatalogProduct["category"],
    imageKey: String(row.image_key ?? ""),
    fulfillmentType: String(row.fulfillment_type) as CatalogProduct["fulfillmentType"],
    featured: row.featured === true || row.featured === "true",
    inventoryLabel: String(row.inventory_label ?? ""),
    priceId: String(row.price_id),
    unitAmount: Number(row.unit_amount),
    currency: String(row.currency),
  };
}

async function queryCatalogProducts(priceIds?: string[]): Promise<CatalogProduct[]> {
  const priceFilter = priceIds?.length
    ? sql`AND pr.id IN (${sql.join(priceIds.map((id) => sql`${id}`), sql`, `)})`
    : sql``;
  const result = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      COALESCE(p.description, '') AS description,
      p.metadata->>'category' AS category,
      p.metadata->>'image_key' AS image_key,
      p.metadata->>'fulfillment_type' AS fulfillment_type,
      p.metadata->>'featured' AS featured,
      COALESCE(p.metadata->>'inventory_label', '') AS inventory_label,
      pr.id AS price_id,
      pr.unit_amount,
      pr.currency
    FROM stripe.products p
    JOIN stripe.prices pr
      ON pr.product = p.id
      AND pr.active = true
      AND pr.type = 'one_time'
    WHERE
      p.active = true
      AND p.metadata->>'catalog' = 'aimd_store'
      AND p.metadata->>'category' IN ('apparel', 'canvas', 'digital')
      AND p.metadata->>'fulfillment_type' IN ('physical', 'digital')
      AND pr.unit_amount IS NOT NULL
      ${priceFilter}
    ORDER BY
      CASE WHEN p.metadata->>'featured' = 'true' THEN 0 ELSE 1 END,
      p.created,
      p.name
  `);
  return (result.rows as Record<string, unknown>[]).map(mapCatalogRow);
}

function mapOrderItem(item: StoreOrderItem) {
  return {
    id: item.id,
    stripeProductId: item.stripeProductId,
    stripePriceId: item.stripePriceId,
    productName: item.productName,
    productDescription: item.productDescription,
    productCategory: item.productCategory,
    productImageKey: item.productImageKey,
    fulfillmentType: item.fulfillmentType,
    quantity: item.quantity,
    unitAmount: item.unitAmountCents,
    totalAmount: item.totalAmountCents,
  };
}

function mapOrder(order: StoreOrder, items: StoreOrderItem[]) {
  return {
    id: order.id,
    confirmationToken: order.confirmationToken,
    customerEmail: order.customerEmail,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotalCents,
    shipping: order.shippingCents,
    tax: order.taxCents,
    total: order.totalCents,
    items: items.map(mapOrderItem),
    paidAt: order.paidAt,
    createdAt: order.createdAt,
  };
}

async function getOrderWithItems(order: StoreOrder) {
  const items = await db
    .select()
    .from(storeOrderItemsTable)
    .where(eq(storeOrderItemsTable.orderId, order.id))
    .orderBy(storeOrderItemsTable.id);
  return mapOrder(order, items);
}

async function reconcilePendingOrder(order: StoreOrder): Promise<StoreOrder> {
  if (
    !order.stripePaymentIntentId
    || !["creating", "awaiting_payment", "processing"].includes(order.status)
  ) {
    return order;
  }

  const result = await db.execute(sql`
    SELECT status, amount, amount_received
    FROM stripe.payment_intents
    WHERE id = ${order.stripePaymentIntentId}
    LIMIT 1
  `);
  const paymentIntent = result.rows[0] as {
    status?: string;
    amount?: number;
    amount_received?: number;
  } | undefined;
  if (!paymentIntent) return order;

  let status: StoreOrder["status"] | null = null;
  let paidAt: Date | undefined;
  if (
    paymentIntent.status === "succeeded"
    && Number(paymentIntent.amount) === order.totalCents
    && Number(paymentIntent.amount_received) === order.totalCents
  ) {
    status = "paid";
    paidAt = new Date();
  } else if (paymentIntent.status === "processing") {
    status = "processing";
  } else if (paymentIntent.status === "canceled") {
    status = "canceled";
  }

  if (!status || status === order.status) return order;
  const [updated] = await db
    .update(storeOrdersTable)
    .set({
      status,
      ...(paidAt ? { paidAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(storeOrdersTable.id, order.id))
    .returning();
  return updated ?? order;
}

router.get("/products", async (req, res): Promise<void> => {
  try {
    res.json(ListStoreProductsResponse.parse(await queryCatalogProducts()));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load storefront catalog");
    res.status(503).json({ error: "The AIMD shop is temporarily unavailable." });
  }
});

router.post("/payment-intents", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!STORE_CHECKOUT_ENABLED) {
    res.status(503).json({ error: "Online checkout is coming soon." });
    return;
  }
  const parsed = CreateStorePaymentIntentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid storefront checkout request");
    res.status(400).json({ error: "Please check your cart and checkout details." });
    return;
  }

  let createdOrderId: string | null = null;
  try {
    const quantities = new Map<string, number>();
    for (const item of parsed.data.items) {
      const next = (quantities.get(item.priceId) ?? 0) + item.quantity;
      if (next > 10) {
        res.status(400).json({ error: "A product quantity cannot exceed 10." });
        return;
      }
      quantities.set(item.priceId, next);
    }

    const priceIds = [...quantities.keys()];
    const products = await queryCatalogProducts(priceIds);
    if (products.length !== priceIds.length) {
      res.status(400).json({ error: "One or more products are unavailable. Please refresh your cart." });
      return;
    }

    const currency = products[0]?.currency.toLowerCase();
    if (!currency || products.some((product) => product.currency.toLowerCase() !== currency)) {
      res.status(400).json({ error: "All products in an order must use the same currency." });
      return;
    }

    const items = products.map((product) => {
      const quantity = quantities.get(product.priceId) ?? 0;
      return { product, quantity, totalAmount: product.unitAmount * quantity };
    });
    const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const hasPhysicalItems = items.some((item) => item.product.fulfillmentType === "physical");
    if (subtotal <= 0 || subtotal > MAX_ORDER_CENTS) {
      res.status(400).json({ error: "This cart total cannot be processed online." });
      return;
    }
    if (hasPhysicalItems && !parsed.data.shippingAddress) {
      res.status(400).json({ error: "A shipping address is required for physical products." });
      return;
    }
    if (hasPhysicalItems && parsed.data.shippingAddress?.country.toUpperCase() !== "US") {
      res.status(400).json({ error: "Physical products currently ship within the United States." });
      return;
    }

    const shipping = hasPhysicalItems && subtotal < FREE_SHIPPING_THRESHOLD_CENTS
      ? STANDARD_SHIPPING_CENTS
      : 0;
    const tax = 0;
    const total = subtotal + shipping;
    const orderId = randomUUID();
    const confirmationToken = randomUUID();
    createdOrderId = orderId;

    await db.transaction(async (tx) => {
      await tx.insert(storeOrdersTable).values({
        id: orderId,
        confirmationToken,
        userId: req.dbUser?.id ?? null,
        customerEmail: parsed.data.email.toLowerCase(),
        status: "creating",
        currency,
        subtotalCents: subtotal,
        shippingCents: shipping,
        taxCents: tax,
        totalCents: total,
        shippingAddress: parsed.data.shippingAddress
          ? { ...parsed.data.shippingAddress, country: parsed.data.shippingAddress.country.toUpperCase() }
          : null,
      });
      await tx.insert(storeOrderItemsTable).values(items.map(({ product, quantity, totalAmount }) => ({
        orderId,
        stripeProductId: product.id,
        stripePriceId: product.priceId,
        productName: product.name,
        productDescription: product.description,
        productCategory: product.category,
        productImageKey: product.imageKey,
        fulfillmentType: product.fulfillmentType,
        quantity,
        unitAmountCents: product.unitAmount,
        totalAmountCents: totalAmount,
      })));
    });

    const stripe = await getUncachableStripeClient();
    const address = parsed.data.shippingAddress;
    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      receipt_email: parsed.data.email.toLowerCase(),
      description: `AIMD Store order ${orderId.slice(0, 8).toUpperCase()}`,
      metadata: {
        order_id: orderId,
        order_type: "aimd_store",
        user_id: req.dbUser ? String(req.dbUser.id) : "",
      },
      ...(address
        ? {
            shipping: {
              name: address.name,
              phone: address.phone ?? undefined,
              address: {
                line1: address.line1,
                line2: address.line2 ?? undefined,
                city: address.city,
                state: address.state,
                postal_code: address.postalCode,
                country: address.country.toUpperCase(),
              },
            },
          }
        : {}),
    });

    if (!intent.client_secret) {
      await stripe.paymentIntents.cancel(intent.id);
      throw new Error("Stripe did not return a client secret");
    }

    const [updatedOrder] = await db
      .update(storeOrdersTable)
      .set({
        stripePaymentIntentId: intent.id,
        status: "awaiting_payment",
        updatedAt: new Date(),
      })
      .where(eq(storeOrdersTable.id, orderId))
      .returning();

    res.status(201).json(CreateStorePaymentIntentResponse.parse({
      clientSecret: intent.client_secret,
      order: await getOrderWithItems(updatedOrder),
    }));
  } catch (error) {
    if (createdOrderId) {
      await db
        .update(storeOrdersTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(storeOrdersTable.id, createdOrderId))
        .catch(() => undefined);
    }
    req.log.error({ err: error }, "Failed to create storefront payment intent");
    res.status(503).json({ error: "Checkout could not be started. Please try again." });
  }
});

router.get("/orders/me", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!req.dbUser) {
    res.status(401).json({ error: "Sign in to view purchase history." });
    return;
  }
  const storedOrders = await db
    .select()
    .from(storeOrdersTable)
    .where(eq(storeOrdersTable.userId, req.dbUser.id))
    .orderBy(desc(storeOrdersTable.createdAt));
  if (!storedOrders.length) {
    res.json(ListMyStoreOrdersResponse.parse([]));
    return;
  }
  const orders = await Promise.all(storedOrders.map(reconcilePendingOrder));
  const items = await db
    .select()
    .from(storeOrderItemsTable)
    .where(inArray(storeOrderItemsTable.orderId, orders.map((order) => order.id)))
    .orderBy(storeOrderItemsTable.id);
  const byOrder = new Map<string, StoreOrderItem[]>();
  for (const item of items) {
    const group = byOrder.get(item.orderId) ?? [];
    group.push(item);
    byOrder.set(item.orderId, group);
  }
  res.json(ListMyStoreOrdersResponse.parse(
    orders.map((order) => mapOrder(order, byOrder.get(order.id) ?? [])),
  ));
});

router.get("/orders/:confirmationToken", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const params = GetStoreOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order confirmation." });
    return;
  }
  const [order] = await db
    .select()
    .from(storeOrdersTable)
    .where(eq(storeOrdersTable.confirmationToken, params.data.confirmationToken))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json(GetStoreOrderResponse.parse(await getOrderWithItems(
    await reconcilePendingOrder(order),
  )));
});

export default router;
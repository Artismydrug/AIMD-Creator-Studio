export type StoreProductDefinition = {
  catalogKey: string;
  name: string;
  description: string;
  unitAmount: number;
  category: "apparel" | "canvas" | "digital";
  imageKey: string;
  fulfillmentType: "physical" | "digital";
  featured: boolean;
  inventoryLabel: string;
  galleryPublished: boolean;
  imageUrl?: string;
  productUrl?: string;
  apparelNote?: string;
};

/**
 * This is the single maintainable catalog input for the Stripe store.
 *
 * To publish a product in Gallery, set galleryPublished to true and provide
 * both its public HTTPS image URL and its exact AIMD product-page URL. Run
 * seed:store after changes, then check:store to catch live-catalog drift.
 */
export const STORE_PRODUCTS: StoreProductDefinition[] = [
  {
    catalogKey: "signature-tee",
    name: "AIMD Signature Art Is My Drug Tee",
    description: "The original AIMD signature tee. Every purchase helps place art supplies in the hands of a young creator.",
    unitAmount: 2000,
    category: "apparel",
    imageKey: "signature-tee",
    fulfillmentType: "physical",
    featured: true,
    inventoryLabel: "Give Back Initiative",
    galleryPublished: true,
    imageUrl: "https://static.wixstatic.com/media/71a471_70672f8ac553445a812263ac1f9e39c9~mv2.png/v1/fit/w_500,h_500,q_90/file.png",
    productUrl: "https://www.artismydrug.org/product-page/aimd-signature-art-is-my-drug-tee-buy-one-donate-one",
    apparelNote: "Choose your size and available color on the secure AIMD store.",
  },
  {
    catalogKey: "vision-tee",
    name: "Art Is My Drug Vision Graphic Tee",
    description: "A bold wearable statement built around AIMD’s original vision graphic.",
    unitAmount: 4000,
    category: "apparel",
    imageKey: "vision-tee",
    fulfillmentType: "physical",
    featured: false,
    inventoryLabel: "Pre-order",
    galleryPublished: true,
    imageUrl: "https://static.wixstatic.com/media/71a471_407066533e6443ec8dc71a0cc206bc23~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
    productUrl: "https://www.artismydrug.org/product-page/art-is-my-drug-vision-graphic-tee",
    apparelNote: "Choose your size and available color on the secure AIMD store.",
  },
  {
    catalogKey: "freestyle-original",
    name: "Freestyle Signature Pattern Handcrafted Piece",
    description: "A one-of-one handcrafted signature artwork created for collectors who believe in the movement.",
    unitAmount: 100000,
    category: "canvas",
    imageKey: "freestyle-original",
    fulfillmentType: "physical",
    featured: true,
    inventoryLabel: "Limited Edition",
    galleryPublished: true,
    imageUrl: "https://static.wixstatic.com/media/71a471_85de300ee81e45088d85dd98b64a0168~mv2.png/v1/fit/w_500,h_500,q_90/file.png",
    productUrl: "https://www.artismydrug.org/product-page/freestyle-signature-pattern-handcrafted-piece",
  },
  {
    catalogKey: "split-smile-book",
    name: "Split Smile Coloring Book",
    description: "Smile Through It All — an expressive coloring book for making space, finding focus, and creating through the hard days.",
    unitAmount: 2000,
    category: "canvas",
    imageKey: "split-smile-book",
    fulfillmentType: "physical",
    featured: false,
    inventoryLabel: "In Stock",
    galleryPublished: true,
    imageUrl: "https://static.wixstatic.com/media/71a471_2440f3b34d724911a18e4e3038f9e613~mv2.jpeg/v1/fit/w_500,h_500,q_90/file.jpg",
    productUrl: "https://www.artismydrug.org/product-page/split-smile-coloring-book-smile-through-it-all",
  },
  {
    catalogKey: "transform-canvas",
    name: "Create. Connect. Transform. Canvas Print",
    description: "A gallery-ready canvas print celebrating the three words at the center of the AIMD creator journey.",
    unitAmount: 8500,
    category: "canvas",
    imageKey: "transform-canvas",
    fulfillmentType: "physical",
    featured: false,
    inventoryLabel: "Made to Order",
    galleryPublished: false,
  },
  {
    catalogKey: "digital-flash",
    name: "AIMD Digital Flash Collection — Volume 1",
    description: "A downloadable collection of original AIMD-inspired flash art and creative prompts for personal practice.",
    unitAmount: 1800,
    category: "digital",
    imageKey: "digital-flash",
    fulfillmentType: "digital",
    featured: false,
    inventoryLabel: "Instant Download",
    galleryPublished: false,
  },
];

const AIMD_PRODUCT_URL = /^https:\/\/(www\.)?artismydrug\.org\/product-page\/.+$/;

export function getStoreMetadata(definition: StoreProductDefinition): Record<string, string> {
  return {
    catalog: "aimd_store",
    catalog_key: definition.catalogKey,
    category: definition.category,
    image_key: definition.imageKey,
    fulfillment_type: definition.fulfillmentType,
    featured: String(definition.featured),
    inventory_label: definition.inventoryLabel,
    gallery_published: String(definition.galleryPublished),
    ...(definition.imageUrl ? { image_url: definition.imageUrl } : {}),
    ...(definition.productUrl ? { product_url: definition.productUrl } : {}),
    ...(definition.apparelNote ? { apparel_note: definition.apparelNote } : {}),
  };
}

export function validateStoreCatalog(): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();

  for (const definition of STORE_PRODUCTS) {
    if (keys.has(definition.catalogKey)) {
      errors.push(`Duplicate catalog key: ${definition.catalogKey}`);
    }
    keys.add(definition.catalogKey);

    if (!Number.isInteger(definition.unitAmount) || definition.unitAmount <= 0) {
      errors.push(`${definition.catalogKey}: unitAmount must be a positive integer.`);
    }

    if (definition.galleryPublished) {
      if (!definition.imageUrl || !/^https:\/\//.test(definition.imageUrl)) {
        errors.push(`${definition.catalogKey}: published products need an HTTPS imageUrl.`);
      }
      if (!definition.productUrl || !AIMD_PRODUCT_URL.test(definition.productUrl)) {
        errors.push(`${definition.catalogKey}: published products need an HTTPS AIMD productUrl.`);
      }
    } else if (definition.imageUrl || definition.productUrl) {
      errors.push(`${definition.catalogKey}: unpublished products cannot carry Gallery media or purchase links.`);
    }
  }

  return errors;
}

export function isAimdProductUrl(value: string | undefined): boolean {
  return Boolean(value && AIMD_PRODUCT_URL.test(value));
}
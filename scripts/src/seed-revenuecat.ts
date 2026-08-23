import { ReplitConnectors } from "@replit/connectors-sdk";
import type {
  App,
  Entitlement,
  Offering,
  Package,
  Product,
  Project,
} from "@replit/revenuecat-sdk";

type AppStoreApp = Extract<App, { type: "app_store" }>;

const PROJECT_NAME = "AIMD Network";
const IOS_APP_NAME = "AIMD Network iOS";
const IOS_BUNDLE_ID = "com.artismydrug.aimdnetwork";

const productSpecs = [
  // ── Dedicated Artist (formerly Academy) ─────────────────────────────────────
  {
    storeIdentifier: "aimd_academy_monthly",
    displayName: "Dedicated Artist Monthly",
    title: "Dedicated Artist Monthly",
    duration: "P1M",
    amountMicros: 39_000_000,
    entitlement: "academy",
    packageLookupKey: "academy_monthly",
    packageDisplayName: "Dedicated Artist Monthly",
    position: 0,
  },
  {
    storeIdentifier: "aimd_academy_annual",
    displayName: "Dedicated Artist Annual",
    title: "Dedicated Artist Annual",
    duration: "P1Y",
    amountMicros: 399_000_000,
    entitlement: "academy",
    packageLookupKey: "academy_annual",
    packageDisplayName: "Dedicated Artist Annual",
    position: 1,
  },
  // ── Professional Artist (formerly Pro) ───────────────────────────────────────
  {
    storeIdentifier: "aimd_pro_monthly",
    displayName: "Professional Artist Monthly",
    title: "Professional Artist Monthly",
    duration: "P1M",
    amountMicros: 99_000_000,
    entitlement: "pro",
    packageLookupKey: "pro_monthly",
    packageDisplayName: "Professional Artist Monthly",
    position: 2,
  },
  {
    storeIdentifier: "aimd_pro_annual",          // NEW: Professional annual
    displayName: "Professional Artist Annual",
    title: "Professional Artist Annual",
    duration: "P1Y",
    amountMicros: 999_000_000,
    entitlement: "pro",
    packageLookupKey: "pro_annual",
    packageDisplayName: "Professional Artist Annual",
    position: 3,
  },
] as const;

type ListResponse<T> = {
  items?: T[];
};

async function seedRevenueCat() {
  const connectors = new ReplitConnectors();

  async function request<T>(
    path: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ): Promise<T> {
    const response = await connectors.proxy("revenuecat", path, init);
    const body = await response.json() as T & {
      message?: string;
      type?: string;
    };

    if (!response.ok) {
      throw new Error(
        `RevenueCat ${init?.method ?? "GET"} ${path} failed (${response.status}): ` +
        `${body.type ?? "unknown_error"} ${body.message ?? ""}`.trim(),
      );
    }

    return body;
  }

  const projects = await request<ListResponse<Project>>("/v2/projects?limit=100");
  let project = projects.items?.find((item) => item.name === PROJECT_NAME);

  if (!project) {
    project = await request<Project>("/v2/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: PROJECT_NAME }),
    });
    console.log("Created RevenueCat project:", project.id);
  } else {
    console.log("Found RevenueCat project:", project.id);
  }
  const activeProject = project;

  const apps = await request<ListResponse<App>>(
    `/v2/projects/${activeProject.id}/apps?limit=100`,
  );
  const testStoreApp = apps.items?.find((app) => app.type === "test_store");
  if (!testStoreApp) {
    throw new Error(
      "The AIMD Network project has no Test Store app. Create a fresh RevenueCat project and run the seed again.",
    );
  }

  const matchingIosApps = (apps.items ?? []).filter(
    (app): app is AppStoreApp => (
      app.type === "app_store" &&
      app.app_store.bundle_id === IOS_BUNDLE_ID
    ),
  );
  if (matchingIosApps.length > 1) {
    throw new Error(
      `Multiple App Store apps use bundle ID ${IOS_BUNDLE_ID}; refusing to mutate an ambiguous catalog.`,
    );
  }

  let iosApp = matchingIosApps[0];
  if (!iosApp) {
    const conflictingNamedApp = (apps.items ?? []).find(
      (app): app is AppStoreApp => (
        app.type === "app_store" &&
        app.name === IOS_APP_NAME &&
        app.app_store.bundle_id !== IOS_BUNDLE_ID
      ),
    );
    if (conflictingNamedApp) {
      throw new Error(
        `${IOS_APP_NAME} already exists with bundle ID ${conflictingNamedApp.app_store.bundle_id}; refusing to target the wrong app.`,
      );
    }

    iosApp = await request<AppStoreApp>(`/v2/projects/${activeProject.id}/apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: IOS_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: IOS_BUNDLE_ID },
      }),
    });
    console.log("Created RevenueCat iOS app:", iosApp.id);
  } else {
    console.log("Found RevenueCat iOS app:", iosApp.id);
  }
  const activeIosApp = iosApp;

  const listedProducts = await request<ListResponse<Product>>(
    `/v2/projects/${activeProject.id}/products?limit=100`,
  );
  const products = [...(listedProducts.items ?? [])];

  async function ensureProduct(
    app: App,
    spec: typeof productSpecs[number],
  ): Promise<Product> {
    const existing = products.find((product) => (
      product.app_id === app.id &&
      product.store_identifier === spec.storeIdentifier
    ));
    if (existing) return existing;

    const isTestStore = app.type === "test_store";
    const product = await request<Product>(
      `/v2/projects/${activeProject.id}/products`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_identifier: spec.storeIdentifier,
          app_id: app.id,
          type: "subscription",
          display_name: spec.displayName,
          ...(isTestStore
            ? {
                title: spec.title,
                subscription: { duration: spec.duration },
              }
            : {}),
        }),
      },
    );
    products.push(product);
    console.log(`Created ${app.type} product:`, spec.storeIdentifier);
    return product;
  }

  const productPairs = [];
  for (const spec of productSpecs) {
    const testProduct = await ensureProduct(testStoreApp, spec);
    const iosProduct = await ensureProduct(activeIosApp, spec);

    const existingPrices = await request<Array<{ currency?: string }>>(
      `/v2/projects/${activeProject.id}/products/${testProduct.id}/test_store_prices`,
    );
    if (!existingPrices.some((price) => price.currency === "USD")) {
      await request(
        `/v2/projects/${activeProject.id}/products/${testProduct.id}/test_store_prices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: [{ amount_micros: spec.amountMicros, currency: "USD" }],
          }),
        },
      );
      console.log("Added Test Store price:", spec.storeIdentifier);
    }

    productPairs.push({ spec, testProduct, iosProduct });
  }

  const listedEntitlements = await request<ListResponse<Entitlement>>(
    `/v2/projects/${activeProject.id}/entitlements?limit=100`,
  );
  const entitlements = [...(listedEntitlements.items ?? [])];

  async function ensureEntitlement(
    lookupKey: "academy" | "pro",
    displayName: string,
  ): Promise<Entitlement> {
    const existing = entitlements.find((item) => item.lookup_key === lookupKey);
    if (existing) return existing;

    const entitlement = await request<Entitlement>(
      `/v2/projects/${activeProject.id}/entitlements`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookup_key: lookupKey,
          display_name: displayName,
        }),
      },
    );
    entitlements.push(entitlement);
    console.log("Created entitlement:", lookupKey);
    return entitlement;
  }

  const academyEntitlement = await ensureEntitlement(
    "academy",
    "Academy Access",
  );
  const proEntitlement = await ensureEntitlement(
    "pro",
    "Professional Artist Access",
  );

  async function attachMissingEntitlementProducts(
    entitlement: Entitlement,
    expectedProducts: Product[],
  ) {
    const attached = await request<ListResponse<Product>>(
      `/v2/projects/${activeProject.id}/entitlements/${entitlement.id}/products?limit=100`,
    );
    const attachedIds = new Set((attached.items ?? []).map((product) => product.id));
    const missingIds = expectedProducts
      .filter((product) => !attachedIds.has(product.id))
      .map((product) => product.id);

    if (missingIds.length === 0) return;

    await request(
      `/v2/projects/${activeProject.id}/entitlements/${entitlement.id}/actions/attach_products`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: missingIds }),
      },
    );
  }

  await attachMissingEntitlementProducts(
    academyEntitlement,
    productPairs
      .filter(({ spec }) => spec.entitlement === "academy")
      .flatMap(({ testProduct, iosProduct }) => [testProduct, iosProduct]),
  );
  await attachMissingEntitlementProducts(
    proEntitlement,
    productPairs
      .filter(({ spec }) => spec.entitlement === "pro")
      .flatMap(({ testProduct, iosProduct }) => [testProduct, iosProduct]),
  );

  const listedOfferings = await request<ListResponse<Offering>>(
    `/v2/projects/${activeProject.id}/offerings?limit=100`,
  );
  let offering = listedOfferings.items?.find(
    (item) => item.lookup_key === "default",
  );
  if (!offering) {
    offering = await request<Offering>(
      `/v2/projects/${activeProject.id}/offerings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookup_key: "default",
          display_name: "AIMD Memberships",
        }),
      },
    );
    console.log("Created default offering:", offering.id);
  }

  if (!offering.is_current) {
    offering = await request<Offering>(
      `/v2/projects/${activeProject.id}/offerings/${offering.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_current: true }),
      },
    );
  }

  const listedPackages = await request<ListResponse<Package>>(
    `/v2/projects/${activeProject.id}/offerings/${offering.id}/packages?limit=100`,
  );
  const packages = [...(listedPackages.items ?? [])];

  for (const pair of productPairs) {
    let membershipPackage = packages.find(
      (item) => item.lookup_key === pair.spec.packageLookupKey,
    );
    if (!membershipPackage) {
      membershipPackage = await request<Package>(
        `/v2/projects/${activeProject.id}/offerings/${offering.id}/packages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lookup_key: pair.spec.packageLookupKey,
            display_name: pair.spec.packageDisplayName,
            position: pair.spec.position,
          }),
        },
      );
      packages.push(membershipPackage);
      console.log("Created package:", pair.spec.packageLookupKey);
    }

    const attached = await request<ListResponse<{ product: Product }>>(
      `/v2/projects/${activeProject.id}/packages/${membershipPackage.id}/products?limit=100`,
    );
    const attachedIds = new Set(
      (attached.items ?? []).map((association) => association.product.id),
    );
    const missingProducts = [pair.testProduct, pair.iosProduct]
      .filter((product) => !attachedIds.has(product.id));

    if (missingProducts.length > 0) {
      await request(
        `/v2/projects/${activeProject.id}/packages/${membershipPackage.id}/actions/attach_products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: missingProducts.map((product) => ({
              product_id: product.id,
              eligibility_criteria: "all",
            })),
          }),
        },
      );
    }
  }

  const testKeys = await request<ListResponse<{ key?: string }>>(
    `/v2/projects/${activeProject.id}/apps/${testStoreApp.id}/public_api_keys`,
  );
  const iosKeys = await request<ListResponse<{ key?: string }>>(
    `/v2/projects/${activeProject.id}/apps/${activeIosApp.id}/public_api_keys`,
  );

  console.log("RevenueCat setup verified.");
  console.log("Project ID:", activeProject.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", activeIosApp.id);
  console.log("Academy Entitlement ID:", academyEntitlement.id);
  console.log("Pro Entitlement ID:", proEntitlement.id);
  console.log("Test Store public key available:", Boolean(testKeys.items?.[0]?.key));
  console.log("iOS public key available:", Boolean(iosKeys.items?.[0]?.key));
}

seedRevenueCat().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
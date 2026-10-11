import { afterAll, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ created: vi.fn(), end: vi.fn(async () => undefined), on: vi.fn() }));
vi.mock("stripe-replit-sync", () => ({
  StripeSync: class {
    postgresClient = { pool: { end: mocks.end, on: mocks.on } };
    constructor(config: unknown) { mocks.created(config); }
  },
}));
vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connector.example.test");
vi.stubEnv("REPL_IDENTITY", "test-identity");
vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
  items: [{ settings: { secret: "not-a-real-key" } }],
}))));

import { withStripeSync, closeStripeSyncPools } from "./stripeClient";

afterAll(async () => {
  await closeStripeSyncPools();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("bounds Stripe operations, reuses its pool, and installs an idle-error listener", async () => {
  let release!: () => void;
  let started!: () => void;
  const hasStarted = new Promise<void>((resolve) => { started = resolve; });
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const first = withStripeSync(async () => { started(); await pending; });
  const second = withStripeSync(async () => { await pending; });
  try {
    await hasStarted;
    await expect(withStripeSync(async () => undefined)).rejects.toMatchObject({ status: 503 });
    expect(mocks.created).toHaveBeenCalledTimes(1);
    expect(mocks.created.mock.calls[0][0]).toMatchObject({ poolConfig: { max: 4, connectionTimeoutMillis: 5_000 } });
    expect(mocks.on).toHaveBeenCalledWith("error", expect.any(Function));
  } finally { release(); await Promise.all([first, second]); }
  await withStripeSync(async () => undefined);
  expect(mocks.created).toHaveBeenCalledTimes(1);
});

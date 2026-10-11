import { describe, expect, it, vi } from "vitest";
import { createClientLifecycle } from "./stripeSyncLifecycle";

describe("shared provider client lifecycle", () => {
  it("coalesces config requests and reuses one client across concurrent operations", async () => {
    const load = vi.fn(async () => "one");
    const create = vi.fn((key: string) => ({ key }));
    const dispose = vi.fn(async () => undefined);
    const clients = createClientLifecycle(load, (a, b) => a === b, create, dispose);
    const results = await Promise.all(Array.from({ length: 20 }, () => clients.run(async (client) => client.key)));
    expect(results.every((value) => value === "one")).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    await clients.run(async () => undefined);
    expect(load).toHaveBeenCalledTimes(2); // Rotated credentials are still checked.
    expect(create).toHaveBeenCalledTimes(1);
    await clients.close();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("rotates without closing a client still processing an earlier webhook", async () => {
    let config = "one";
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const dispose = vi.fn(async (_client: { key: string }) => undefined);
    const clients = createClientLifecycle(async () => config, (a, b) => a === b, (key) => ({ key }), dispose);
    let started!: () => void;
    const hasStarted = new Promise<void>((resolve) => { started = resolve; });
    const first = clients.run(async (client) => { started(); await pending; return client.key; });
    await hasStarted;
    config = "two";
    expect(await clients.run(async (client) => client.key)).toBe("two");
    expect(dispose).not.toHaveBeenCalled();
    release();
    expect(await first).toBe("one");
    expect(dispose).toHaveBeenCalledWith({ key: "one" });
    await clients.close();
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it("fails explicitly if configuration refresh fails rather than using stale credentials", async () => {
    const load = vi.fn().mockResolvedValueOnce("one").mockRejectedValueOnce(new Error("connector unavailable"));
    const clients = createClientLifecycle(load, (a, b) => a === b, (key) => ({ key }), async () => undefined);
    await clients.run(async () => undefined);
    const operation = vi.fn();
    await expect(clients.run(operation)).rejects.toThrow("connector unavailable");
    expect(operation).not.toHaveBeenCalled();
    await clients.close();
  });

  it("waits for active work to finish on shutdown and rejects new work", async () => {
    let release!: () => void;
    let started!: () => void;
    const hasStarted = new Promise<void>((resolve) => { started = resolve; });
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const dispose = vi.fn(async () => undefined);
    const clients = createClientLifecycle(async () => "one", (a, b) => a === b, (key) => ({ key }), dispose);
    const active = clients.run(async () => { started(); await pending; });
    await hasStarted;
    const closing = clients.close();
    expect(dispose).not.toHaveBeenCalled();
    await expect(clients.run(async () => undefined)).rejects.toThrow("shutting down");
    release();
    await Promise.all([active, closing]);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

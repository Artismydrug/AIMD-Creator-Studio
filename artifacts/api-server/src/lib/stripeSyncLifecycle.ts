/** Reuse a provider/database client, without closing a rotated client mid-operation.
 * Config is refreshed for every operation; overlapping refreshes are coalesced. */
export function createClientLifecycle<C, T>(
  loadConfig: () => Promise<C>,
  sameConfig: (a: C, b: C) => boolean,
  create: (config: C) => T,
  dispose: (client: T) => Promise<void>,
) {
  type Entry = { config: C; client: T; uses: number; retired: boolean; closed: Promise<void>; finish: () => void; disposing?: Promise<void> };
  const entries = new Set<Entry>();
  let current: Entry | undefined;
  let loading: Promise<C> | undefined;
  let stopped = false;
  const closeEntry = (entry: Entry) => {
    if (!entry.disposing && entry.retired && entry.uses === 0) {
      entry.disposing = Promise.resolve().then(() => dispose(entry.client)).finally(() => {
        entries.delete(entry);
        entry.finish();
      });
      // The owning shutdown/operation still observes disposal failures.
      void entry.disposing.catch(() => undefined);
    }
    return entry.disposing;
  };
  return {
    async run<R>(operation: (client: T) => Promise<R>): Promise<R> {
      if (stopped) throw new Error("Provider client is shutting down");
      if (!loading) loading = Promise.resolve().then(loadConfig).finally(() => { loading = undefined; });
      const config = await loading;
      if (stopped) throw new Error("Provider client is shutting down");
      if (!current || !sameConfig(config, current.config)) {
        const previous = current;
        let finish!: () => void;
        const closed = new Promise<void>((resolve) => { finish = resolve; });
        current = { config, client: create(config), uses: 0, retired: false, closed, finish };
        entries.add(current);
        if (previous) { previous.retired = true; closeEntry(previous); }
      }
      const entry = current;
      entry.uses++;
      try { return await operation(entry.client); }
      finally {
        entry.uses--;
        await closeEntry(entry);
      }
    },
    async close(): Promise<void> {
      stopped = true;
      const remaining = [...entries];
      for (const entry of remaining) { entry.retired = true; closeEntry(entry); }
      await Promise.all(remaining.map(async (entry) => {
        await entry.closed;
        await entry.disposing;
      }));
    },
  };
}

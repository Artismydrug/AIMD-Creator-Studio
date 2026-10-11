/** Single-flight, bounded readiness checks, including a short failure cache. */
export function createReadinessProbe(
  query: () => Promise<unknown>,
  { timeoutMs = 2_000, cacheMs = 1_000, now = Date.now } = {},
) {
  let pending: Promise<boolean> | undefined;
  let cached = false;
  let expires = 0;
  return async (): Promise<boolean> => {
    if (now() < expires) return cached;
    if (!pending) {
      pending = Promise.resolve().then(query).then(
        () => { cached = true; expires = now() + cacheMs; return true; },
        () => { cached = false; expires = now() + cacheMs; return false; },
      ).finally(() => { pending = undefined; });
    }
    const probe = pending;
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        cached = false;
        expires = now() + cacheMs;
        resolve(false);
      }, timeoutMs);
      probe.then((healthy) => { clearTimeout(timer); resolve(healthy); });
    });
  };
}

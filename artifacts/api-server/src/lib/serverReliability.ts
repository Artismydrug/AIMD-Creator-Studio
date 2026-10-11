import type { ErrorRequestHandler, RequestHandler } from "express";

let draining = false;
export function setServerDraining(value = true) { draining = value; }

type HeavyRequest = Parameters<RequestHandler>[0];
const heavyJobs = new WeakMap<HeavyRequest, { running: boolean; release: () => void }>();

/** Reserve before body buffering; keep running CPU work reserved on disconnect. */
export function heavyAdmissionGuard(
  maximum: number, matches: (req: HeavyRequest) => boolean,
): RequestHandler {
  let active = 0;
  return (req, res, next) => {
    if (!matches(req)) return next();
    if (draining || active >= maximum) {
      res.set("Retry-After", "1").status(503).json({ error: "Media processing is busy. Please try again." });
      return;
    }
    active++;
    let released = false;
    const lease = { running: false, release: () => {
      if (released) return;
      released = true;
      active--;
      heavyJobs.delete(req);
      res.off("finish", settle);
      res.off("close", settle);
    } };
    function settle() { if (!lease.running) lease.release(); }
    heavyJobs.set(req, lease);
    res.once("finish", settle);
    res.once("close", settle);
    next();
  };
}

/** Use only around the terminal async handler, after its body parser. */
export function trackHeavyWork(handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    if (res.destroyed) return;
    const lease = heavyJobs.get(req);
    if (lease) lease.running = true;
    try { await handler(req, res, next); }
    finally { lease?.release(); }
  };
}

/** Bound work before parsing bodies/authentication; this is not a user quota. */
export function apiAdmissionGuard(
  maxInFlight = 100,
  matches: (req: Parameters<RequestHandler>[0]) => boolean = () => true,
): RequestHandler {
  let active = 0;
  return (req, res, next) => {
    if (req.path === "/livez" || !matches(req)) return next();
    if (draining || active >= maxInFlight) {
      res.set("Retry-After", "1").status(503).json({ error: "Server is temporarily busy. Please try again." });
      return;
    }
    active++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
      res.off("finish", release);
      res.off("close", release);
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  };
}

export function isTransientDatabaseError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const e = current as { code?: string; message?: string; cause?: unknown };
    if (/^(08|53)/.test(e.code ?? "") || [
      "57P01", "57P02", "57P03", "57014", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE", "ENOTFOUND",
    ].includes(e.code ?? "")) return true;
    if (/timeout exceeded when trying to connect|connection (terminated|timeout)|query read timeout|ECONNREFUSED|ECONNRESET|ETIMEDOUT/i.test(e.message ?? "")) return true;
    current = e.cause;
  }
  return false;
}

export const apiErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // Do not log SQL parameters, request bodies or credentials from wrapped errors.
  req.log?.error({ errorName: error?.name, errorCode: error?.cause?.code ?? error?.code }, "API request failed");
  if (res.headersSent || res.destroyed) {
    if (!res.destroyed) res.destroy();
    return;
  }
  if (isTransientDatabaseError(error) || error?.status === 503) {
    res.set("Retry-After", "1").status(503).json({ error: "Service is temporarily unavailable. Please try again." });
    return;
  }
  const status = Number(error?.status ?? error?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 413 ? "Request body is too large." : "Invalid request." });
    return;
  }
  res.status(500).json({ error: "We could not complete this request. Please try again." });
};

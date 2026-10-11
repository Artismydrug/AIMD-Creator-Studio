import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { createReadinessProbe } from "../lib/readiness";

const router: IRouter = Router();

router.get("/livez", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

const ready = createReadinessProbe(() => pool.query("SELECT 1"));
router.get(["/healthz", "/readyz"], async (_req, res) => {
  if (!await ready()) {
    res.set("Cache-Control", "no-store").set("Retry-After", "1").status(503).json({ status: "unavailable" });
    return;
  }
  res.set("Cache-Control", "no-store").json(HealthCheckResponse.parse({ status: "ok" }));
});

export default router;

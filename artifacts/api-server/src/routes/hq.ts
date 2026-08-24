import { Router, type IRouter } from "express";
import { db, usersTable, habitsTable, communityEventsTable, assignmentsTable } from "@workspace/db";
import { count, eq, gte, sql } from "drizzle-orm";
import { requireInstructor } from "../middlewares/requireInstructor";
const router: IRouter = Router();
router.get("/hq/summary", requireInstructor, async (_req, res) => {
  const rows = await db.select({ tier: usersTable.tier, count: count() }).from(usersTable).groupBy(usersTable.tier);
  const active = await db.select({ count: count() }).from(habitsTable).where(gte(habitsTable.currentStreak, 1));
  const events = await db.select({ count: count() }).from(communityEventsTable).where(gte(communityEventsTable.startsAt, new Date()));
  const reviews = await db.select({ count: count() }).from(assignmentsTable).where(eq(assignmentsTable.status, "pending"));
  const byTier = Object.fromEntries(rows.map(r => [r.tier, Number(r.count)]));
  res.json({ tiers: { free: byTier.free ?? 0, dedicated: byTier.workshop ?? byTier.academy ?? 0, pro: byTier.pro ?? 0 }, streakSignals: Number(active[0]?.count ?? 0), mrrCents: null, nonprofitCents: null, events: Number(events[0]?.count ?? 0), pendingReviews: Number(reviews[0]?.count ?? 0) });
});
router.post("/hq/announcements", requireInstructor, async (req, res) => {
  if (!String(req.body?.title ?? "").trim() || !String(req.body?.body ?? "").trim()) { res.status(400).json({ error: "Title and body are required" }); return; }
  res.status(201).json({ status: "saved", delivery: "in_app_only", title: req.body.title, body: req.body.body });
});
export default router;
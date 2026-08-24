import { Router, type IRouter } from "express";
import { db, pool, usersTable, habitsTable, communityEventsTable, assignmentsTable } from "@workspace/db";
import { count, eq, gte, sql } from "drizzle-orm";
import { requireInstructor } from "../middlewares/requireInstructor";
import { createClerkClient } from "@clerk/express";
const router: IRouter = Router();
router.get("/hq/summary", requireInstructor, async (_req, res) => {
  const rows = await db.select({ tier: usersTable.tier, count: count() }).from(usersTable).groupBy(usersTable.tier);
  const active = await db.select({ count: count() }).from(habitsTable).where(gte(habitsTable.currentStreak, 1));
  const events = await db.select({ count: count() }).from(communityEventsTable).where(gte(communityEventsTable.startsAt, new Date()));
  const reviews = await db.select({ count: count() }).from(assignmentsTable).where(eq(assignmentsTable.status, "pending"));
  const { rows: ledgerRows } = await pool.query<{ revenue: string; cloud: string; royalties: string }>(`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (WHERE entry_type = 'eligible_subscription_revenue'), 0)::text AS revenue,
      COALESCE(SUM(amount_cents) FILTER (WHERE entry_type = 'cloud_infrastructure'), 0)::text AS cloud,
      COALESCE(SUM(amount_cents) FILTER (WHERE entry_type = 'instructor_royalty'), 0)::text AS royalties
    FROM hq_financial_entries
    WHERE effective_on >= date_trunc('month', CURRENT_DATE)
  `);
  const revenue = Number(ledgerRows[0]?.revenue ?? 0);
  const cloud = Number(ledgerRows[0]?.cloud ?? 0);
  const royalties = Number(ledgerRows[0]?.royalties ?? 0);
  const netSubscriptionProfit = Math.max(0, Math.round(revenue * 0.85) - cloud - royalties);
  const byTier = Object.fromEntries(rows.map(r => [r.tier, Number(r.count)]));
  res.json({ tiers: { free: byTier.free ?? 0, dedicated: byTier.workshop ?? byTier.academy ?? 0, pro: byTier.pro ?? 0 }, streakSignals: Number(active[0]?.count ?? 0), mrrCents: revenue || null, nonprofitCents: revenue ? Math.round(netSubscriptionProfit * 0.15) : null, events: Number(events[0]?.count ?? 0), pendingReviews: Number(reviews[0]?.count ?? 0) });
});
router.post("/hq/announcements", requireInstructor, async (req, res) => {
  if (!String(req.body?.title ?? "").trim() || !String(req.body?.body ?? "").trim()) { res.status(400).json({ error: "Title and body are required" }); return; }
  const { rows } = await pool.query(`INSERT INTO hq_announcements (title, body, audience, delivery, created_by) VALUES ($1,$2,$3,'in_app',$4) RETURNING id, created_at`, [String(req.body.title).trim(), String(req.body.body).trim(), String(req.body.audience ?? "all_creators"), req.dbUser!.id]);
  res.status(201).json({ id: rows[0].id, status: "saved", delivery: "in_app_only", title: req.body.title, body: req.body.body, createdAt: rows[0].created_at });
});
router.get("/hq/announcements", requireInstructor, async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, title, body, audience, delivery, created_at FROM hq_announcements ORDER BY created_at DESC LIMIT 30`);
  res.json(rows);
});
router.get("/hq/affiliates", requireInstructor, async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, name, category, affiliate_code AS "affiliateCode", perk, active FROM affiliate_partners ORDER BY active DESC, name`);
  res.json(rows);
});
router.post("/hq/affiliates", requireInstructor, async (req, res) => {
  const { name, category, affiliateCode, perk } = req.body ?? {};
  const categories = ["Visual Arts", "Tattoo Supplies", "Audio Production", "Fashion Manufacturing", "Athletics"];
  if (![name, category, affiliateCode, perk].every((value) => typeof value === "string" && value.trim()) || !categories.includes(category)) { res.status(400).json({ error: "A partner name, listed category, unique code, and perk are required." }); return; }
  try {
    const { rows } = await pool.query(`INSERT INTO affiliate_partners (name, category, affiliate_code, perk, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, category, affiliate_code AS "affiliateCode", perk, active`, [name.trim(), category, affiliateCode.trim().toUpperCase(), perk.trim(), req.dbUser!.id]);
    res.status(201).json(rows[0]);
  } catch { res.status(409).json({ error: "That affiliate code is already in use." }); }
});
router.get("/hq/ledger", requireInstructor, async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, entry_type AS "entryType", amount_cents AS "amountCents", effective_on AS "effectiveOn", note FROM hq_financial_entries ORDER BY effective_on DESC, id DESC LIMIT 100`);
  res.json(rows);
});
router.post("/hq/ledger", requireInstructor, async (req, res) => {
  if (!req.dbUser!.isAdmin) { res.status(403).json({ error: "Admin access required to record a ledger entry." }); return; }
  const { entryType, amountCents, effectiveOn, note } = req.body ?? {};
  if (!["cloud_infrastructure", "instructor_royalty", "eligible_subscription_revenue"].includes(entryType) || !Number.isInteger(amountCents) || amountCents < 0) { res.status(400).json({ error: "Use a supported entry type and a non-negative whole-cent amount." }); return; }
  const { rows } = await pool.query(`INSERT INTO hq_financial_entries (entry_type, amount_cents, effective_on, note, created_by) VALUES ($1,$2,COALESCE($3::date,current_date),$4,$5) RETURNING id`, [entryType, amountCents, effectiveOn ?? null, note ?? null, req.dbUser!.id]);
  res.status(201).json({ id: rows[0].id });
});
router.get("/hq/residency-applications", requireInstructor, async (_req, res) => {
  const { rows } = await pool.query(`SELECT r.id, r.status, r.portfolio_object_paths AS "portfolioObjectPaths", r.bbp_certification_object_path AS "bbpCertificationObjectPath", r.introduction_video_object_path AS "introductionVideoObjectPath", r.reviewer_note AS "reviewerNote", r.created_at AS "createdAt", u.username, u.email FROM residency_applications r JOIN users u ON u.id = r.user_id ORDER BY r.created_at ASC`);
  res.json(rows);
});
router.post("/hq/residency-applications", async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { portfolioObjectPaths, bbpCertificationObjectPath, introductionVideoObjectPath } = req.body ?? {};
  if (!Array.isArray(portfolioObjectPaths) || portfolioObjectPaths.length === 0 || !portfolioObjectPaths.every((v) => typeof v === "string") || typeof bbpCertificationObjectPath !== "string" || typeof introductionVideoObjectPath !== "string") { res.status(400).json({ error: "Portfolio, BBP certification, and an introduction video are required." }); return; }
  const { rows } = await pool.query(`INSERT INTO residency_applications (user_id, portfolio_object_paths, bbp_certification_object_path, introduction_video_object_path, status) VALUES ($1,$2,$3,$4,'submitted') ON CONFLICT (user_id) DO UPDATE SET portfolio_object_paths=EXCLUDED.portfolio_object_paths, bbp_certification_object_path=EXCLUDED.bbp_certification_object_path, introduction_video_object_path=EXCLUDED.introduction_video_object_path, status='submitted', updated_at=now() RETURNING id, status`, [req.dbUser.id, portfolioObjectPaths, bbpCertificationObjectPath, introductionVideoObjectPath]);
  res.status(201).json(rows[0]);
});
router.patch("/hq/residency-applications/:id", requireInstructor, async (req, res) => {
  if (!req.dbUser!.isAdmin) { res.status(403).json({ error: "Admin access required for residency decisions." }); return; }
  const id = Number(req.params.id); const { decision, note } = req.body ?? {};
  if (!Number.isInteger(id) || !["approved", "revision_requested"].includes(decision)) { res.status(400).json({ error: "Use an application id and supported decision." }); return; }
  const { rows } = await pool.query<{ user_id: number; clerk_id: string | null }>(`UPDATE residency_applications r SET status=$1, reviewer_note=$2, reviewed_by=$3, reviewed_at=now(), updated_at=now() FROM users u WHERE r.id=$4 AND u.id=r.user_id RETURNING r.user_id, u.clerk_id`, [decision, note?.trim() || null, req.dbUser!.id, id]);
  if (!rows[0]) { res.status(404).json({ error: "Residency application not found." }); return; }
  if (decision === "approved") {
    await pool.query(`UPDATE users SET tier='pro' WHERE id=$1`, [rows[0].user_id]);
    if (rows[0].clerk_id && process.env.CLERK_SECRET_KEY) {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const existing = await clerk.users.getUser(rows[0].clerk_id);
      await clerk.users.updateUserMetadata(rows[0].clerk_id, { publicMetadata: { ...existing.publicMetadata, tier3_approved: true } });
    }
  }
  res.json({ id, status: decision });
});
export default router;
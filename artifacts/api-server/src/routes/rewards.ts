/**
 * Rewards & admin points routes
 *
 * GET  /rewards                                        — reward tiers + current user's points
 * POST /admin/points-awards                            — (admin) award points to any user
 * POST /admin/challenges/:submissionId/award-winner    — (admin) award weekly-challenge prize
 */

import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";
import { REWARD_TIERS, CHALLENGE_WINNER_POINTS, awardPoints } from "../lib/rewards";

const router: IRouter = Router();

// ─── GET /rewards ─────────────────────────────────────────────────────────────
router.get("/rewards", async (req, res): Promise<void> => {
  let points = 0;
  if (req.dbUser) {
    const { rows } = await pool.query<{ points: number }>(
      `SELECT points FROM users WHERE id = $1`,
      [(req.dbUser as any).id]
    );
    points = rows[0]?.points ?? 0;
  }
  res.json({
    points,
    challengeWinnerPoints: CHALLENGE_WINNER_POINTS,
    tiers: REWARD_TIERS.map((t) => ({ ...t, unlocked: points >= t.points })),
  });
});

// ─── POST /admin/points-awards ────────────────────────────────────────────────
router.post("/admin/points-awards", requireAdmin, async (req, res): Promise<void> => {
  const { userId, amount, reason } = req.body ?? {};
  const uid = parseInt(String(userId), 10);
  const amt = parseInt(String(amount), 10);

  if (isNaN(uid) || isNaN(amt) || amt === 0 || Math.abs(amt) > 100000) {
    res.status(400).json({ error: "userId and a non-zero amount are required" });
    return;
  }
  if (typeof reason !== "string" || !reason.trim()) {
    res.status(400).json({ error: "reason is required" });
    return;
  }

  try {
    const newBalance = await awardPoints({
      userId: uid,
      amount: amt,
      reason: reason.trim(),
      awardedBy: (req.dbUser as any).id,
    });
    res.status(201).json({ userId: uid, amount: amt, points: newBalance });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /admin/challenges/:submissionId/award-winner ────────────────────────
router.post(
  "/admin/challenges/:submissionId/award-winner",
  requireAdmin,
  async (req, res): Promise<void> => {
    const submissionId = parseInt(String(req.params.submissionId), 10);
    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }

    try {
      const { rows } = await pool.query<{
        user_id: number;
        challenge_week: string;
        username: string;
      }>(
        `SELECT cs.user_id, cs.challenge_week, u.username
         FROM challenge_submissions cs JOIN users u ON u.id = cs.user_id
         WHERE cs.id = $1`,
        [submissionId]
      );
      if (rows.length === 0) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }
      const sub = rows[0];
      const reason = `Weekly Challenge winner (${sub.challenge_week})`;

      // Duplicate wins are prevented by a partial unique index on
      // point_awards (user_id, reason) for challenge-win reasons; a
      // concurrent or repeated award surfaces as a 23505 conflict below.
      let newBalance: number;
      try {
        newBalance = await awardPoints({
          userId: sub.user_id,
          amount: CHALLENGE_WINNER_POINTS,
          reason,
          awardedBy: (req.dbUser as any).id,
        });
      } catch (err: any) {
        if (err?.code === "23505") {
          res.status(409).json({ error: "This creator was already awarded for that week" });
          return;
        }
        throw err;
      }
      res.status(201).json({
        userId: sub.user_id,
        username: sub.username,
        amount: CHALLENGE_WINNER_POINTS,
        points: newBalance,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  }
);

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const { rows } = await pool.query(`
    SELECT
      u.id,
      u.username,
      u.email,
      u.tier,
      u.points,
      u.is_admin   AS "isAdmin",
      u.created_at AS "createdAt",
      COUNT(p.id)::int AS "postCount"
    FROM users u
    LEFT JOIN studio_posts p ON p.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  res.json({ total: rows.length, members: rows });
});

export default router;

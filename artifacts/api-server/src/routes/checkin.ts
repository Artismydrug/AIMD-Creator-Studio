/**
 * POST /checkin
 *
 * Accepts a plain event code (e.g. "AIMD-ATL26"), looks it up in the
 * server-side EVENTS registry, writes a row to the `badges` table, and
 * returns the badge.  Duplicate claims (same user + same event code) are
 * handled gracefully — the existing badge is returned with alreadyClaimed: true.
 *
 * Authentication required: a creator must be signed in to claim a badge.
 */

import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// ─── Server-side event registry ───────────────────────────────────────────────

interface EventBadge {
  name: string;
  description: string;
}

interface AimdEvent {
  code: string;
  name: string;
  badge: EventBadge;
}

const EVENTS: Record<string, AimdEvent> = {
  "AIMD-ATL26": {
    code: "AIMD-ATL26",
    name: "AIMD × Cultured Concrete Pop-Up",
    badge: {
      name: "ATL Attendee",
      description:
        "Present at the AIMD Atlanta Pop-Up. Certified witness to the movement.",
    },
  },
  "AIMD-MIA26": {
    code: "AIMD-MIA26",
    name: "Pro Resident Chair Drop — Miami",
    badge: {
      name: "Miami Resident Drop",
      description:
        "Attended the Miami Chair Drop event. Early access to resident applications.",
    },
  },
  "AIMD-CHI26": {
    code: "AIMD-CHI26",
    name: "AIMD Chicago Art Week",
    badge: {
      name: "Windy City Creator",
      description:
        "Represented at AIMD Chicago Art Week. Community certified.",
    },
  },
};

// ─── POST /checkin ─────────────────────────────────────────────────────────────

router.post("/checkin", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized — sign in to claim a badge" });
    return;
  }

  // req.user is typed as Express.User (which may not expose .id in TS)
  // but the actual runtime object always has it — use a cast.
  const userId = (req.user as any).id as number;
  const rawCode = req.body?.eventCode;

  if (typeof rawCode !== "string" || !rawCode.trim()) {
    res.status(400).json({ error: "eventCode is required" });
    return;
  }

  const code = rawCode.trim().toUpperCase();
  const event = EVENTS[code];

  if (!event) {
    res.status(404).json({ error: "Event code not found" });
    return;
  }

  try {
    // Insert using raw SQL because event_code column is added via ensure migration,
    // not declared in the Drizzle schema type.
    // ON CONFLICT DO NOTHING handles the unique (user_id, event_code) constraint.
    const { rows: inserted } = await pool.query<{
      id: number; name: string; description: string; earned_at: string; event_code: string;
    }>(
      `INSERT INTO badges (user_id, name, description, event_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT uq_badge_user_event_code DO NOTHING
       RETURNING id, name, description, earned_at, event_code`,
      [userId, event.badge.name, event.badge.description, code]
    );

    if (inserted.length > 0) {
      res.status(201).json({ badge: inserted[0], alreadyClaimed: false });
      return;
    }

    // Duplicate — fetch the existing badge
    const { rows: existing } = await pool.query<{
      id: number; name: string; description: string; earned_at: string; event_code: string;
    }>(
      `SELECT id, name, description, earned_at, event_code FROM badges WHERE user_id = $1 AND event_code = $2`,
      [userId, code]
    );

    res.json({ badge: existing[0] ?? null, alreadyClaimed: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /checkin/my-badges ────────────────────────────────────────────────────
// Returns only event (QR) badges belonging to the current user.

router.get("/checkin/my-badges", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = (req.user as any).id as number;

  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, earned_at, event_code FROM badges WHERE user_id = $1 AND event_code IS NOT NULL ORDER BY earned_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

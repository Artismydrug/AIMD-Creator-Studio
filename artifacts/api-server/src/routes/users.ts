import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetCurrentUserResponse,
  UpdateCurrentUserBody,
  UpdateCurrentUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/me", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(user));
});

router.patch("/users/me", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const parsed = UpdateCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Validate username format and uniqueness when changing username
  if (parsed.data.username !== undefined) {
    const username = parsed.data.username;
    if (!/^[a-zA-Z0-9_]{3,28}$/.test(username)) {
      res.status(400).json({ error: "Username must be 3–28 characters and contain only letters, numbers, or underscores." });
      return;
    }
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "That username is already taken. Please choose another." });
      return;
    }
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateCurrentUserResponse.parse(user));
});

// Creator directory — studio-ready creators
router.get("/directory", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.username,
      u.avatar_url        AS "avatarUrl",
      u.tier,
      u.discipline,
      u.bio,
      u.location,
      u.booking_open      AS "bookingOpen",
      u.portfolio_url     AS "portfolioUrl",
      COUNT(DISTINCT p.id)::int  AS "postCount",
      COUNT(DISTINCT b.id)::int  AS "badgeCount"
    FROM users u
    LEFT JOIN studio_posts p ON p.user_id = u.id
    LEFT JOIN badges b       ON b.user_id = u.id
    WHERE u.studio_ready_badge = true
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  res.json(rows.rows);
});

// Public profile for any user by id
router.get("/users/:id/profile", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(sql`
    SELECT
      u.id, u.username, u.email,
      u.first_name AS "firstName", u.last_name AS "lastName",
      u.avatar_url AS "avatarUrl",
      u.tier, u.studio_ready_badge AS "studioReadyBadge",
      u.discipline, u.bio, u.location,
      u.booking_open AS "bookingOpen",
      u.portfolio_url AS "portfolioUrl",
      u.created_at AS "createdAt",
      COUNT(DISTINCT p.id)::int AS "postCount",
      (SELECT COALESCE(MAX(h2.current_streak), 0) FROM habits h2 WHERE h2.user_id = u.id) AS "currentStreak",
      (SELECT COUNT(*)::int FROM badges b WHERE b.user_id = u.id) AS "badgesEarned",
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.user_id = u.id) AS "workshopsEnrolled",
      (
        SELECT json_agg(json_build_object(
          'id', b2.id, 'name', b2.name,
          'imageUrl', b2.image_url,
          'earnedAt', b2.earned_at
        ) ORDER BY b2.earned_at DESC)
        FROM badges b2 WHERE b2.user_id = u.id
      ) AS "recentBadges"
    FROM users u
    LEFT JOIN studio_posts p ON p.user_id = u.id
    WHERE u.id = ${userId}
    GROUP BY u.id
  `);

  if (!rows.rows.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(rows.rows[0]);
});

export default router;

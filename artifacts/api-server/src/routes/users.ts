import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetCurrentUserResponse,
  UpdateCurrentUserBody,
  UpdateCurrentUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CURRENT_USER_ID = 1;

router.get("/users/me", async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, CURRENT_USER_ID));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(user));
});

router.patch("/users/me", async (req, res): Promise<void> => {
  const parsed = UpdateCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, CURRENT_USER_ID))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateCurrentUserResponse.parse(user));
});

// Public profile for any user by id
router.get("/users/:id/profile", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(sql`
    SELECT
      u.id, u.username, u.email, u.avatar_url AS "avatarUrl",
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
        ))
        FROM badges b2 WHERE b2.user_id = u.id
      ) AS badges
    FROM users u
    LEFT JOIN studio_posts p ON p.user_id = u.id
    WHERE u.id = ${userId}
    GROUP BY u.id
  `);

  if (rows.rows.length === 0) { res.status(404).json({ error: "User not found" }); return; }
  res.json(rows.rows[0]);
});

// Public directory — Studio Ready alumni only
router.get("/directory", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.username,
      u.avatar_url       AS "avatarUrl",
      u.tier,
      u.discipline,
      u.bio,
      u.location,
      u.booking_open     AS "bookingOpen",
      u.portfolio_url    AS "portfolioUrl",
      COUNT(DISTINCT b.id)::int  AS "badgeCount",
      COUNT(DISTINCT p.id)::int  AS "postCount"
    FROM users u
    LEFT JOIN badges b       ON b.user_id = u.id
    LEFT JOIN studio_posts p ON p.user_id = u.id
    WHERE u.studio_ready_badge = true
    GROUP BY u.id
    ORDER BY "badgeCount" DESC, u.id
  `);
  res.json(rows.rows);
});

export default router;

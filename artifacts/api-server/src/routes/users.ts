import { Router, type IRouter } from "express";
import { createClerkClient, getAuth } from "@clerk/express";
import { eq, sql } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";
import {
  FollowUserParams,
  FollowUserResponse,
  GetCurrentUserResponse,
  GetUserProfileResponse,
  UnfollowUserParams,
  UnfollowUserResponse,
  UpdateCurrentUserBody,
  UpdateCurrentUserResponse,
} from "@workspace/api-zod";
import { ObjectPermission, getObjectAclPolicy } from "../lib/objectAcl";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { deleteLocalAccount } from "../lib/accountDeletion";
import { logger } from "../lib/logger";
import { createNotification, removeActiveNotification } from "../lib/notifications";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

type FollowSnapshot = {
  targetExists: boolean;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
};

async function getFollowSnapshot(
  targetUserId: number,
  viewerUserId: number,
): Promise<FollowSnapshot> {
  const { rows } = await pool.query<FollowSnapshot>(
    `SELECT
       EXISTS(SELECT 1 FROM users WHERE id = $1) AS "targetExists",
       (SELECT COUNT(*)::int FROM user_follows WHERE following_id = $1) AS "followerCount",
       (SELECT COUNT(*)::int FROM user_follows WHERE follower_id = $1) AS "followingCount",
       EXISTS(
         SELECT 1 FROM user_follows
         WHERE follower_id = $2 AND following_id = $1
       ) AS "followedByMe"`,
    [targetUserId, viewerUserId],
  );
  return rows[0] ?? {
    targetExists: false,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
  };
}

/**
 * Profile avatars are public by design, but must still belong to the creator
 * updating their profile. This rejects another creator's upload and anything
 * with a private ACL, including assignment footage.
 */
async function isOwnedPublicAvatar(userId: number, avatarUrl: string): Promise<boolean> {
  const storagePrefix = "/api/storage";
  if (!avatarUrl.startsWith(`${storagePrefix}/objects/`)) return false;

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(
      avatarUrl.slice(storagePrefix.length),
    );
    const canWrite = await objectStorageService.canAccessObjectEntity({
      userId: String(userId),
      objectFile,
      requestedPermission: ObjectPermission.WRITE,
    });
    const policy = await getObjectAclPolicy(objectFile);
    return canWrite && policy?.owner === String(userId) && policy.visibility === "public";
  } catch (error) {
    if (!(error instanceof ObjectNotFoundError)) {
      logger.warn({ err: error, userId }, "Unable to validate avatar object");
    }
    return false;
  }
}

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

router.delete("/users/me", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const clerkUserId = getAuth(req).userId;
  // A local row must be bound to the same Clerk identity that is making the
  // request. This prevents an email-only/legacy session from deleting a row
  // whose Clerk identity cannot be verified.
  if (!clerkUserId || req.dbUser.clerkId !== clerkUserId) {
    res.status(401).json({ error: "Unable to verify account ownership." });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    logger.error("CLERK_SECRET_KEY is not set — account deletion is unavailable");
    res.status(503).json({ error: "Account deletion is temporarily unavailable." });
    return;
  }

  try {
    const clerk = createClerkClient({ secretKey });

    // Delete the identity first. If this fails, leave the local account intact
    // so a retry cannot strand a still-active Clerk account without its data.
    try {
      await clerk.users.deleteUser(clerkUserId);
    } catch (error: any) {
      // A prior attempt may have deleted Clerk successfully before local
      // cleanup failed. Treat an already-gone identity as safe to finish.
      if (error?.status !== 404) throw error;
    }

    await deleteLocalAccount({
      clerkUserId,
      localUserId: req.dbUser.id,
    });
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error, clerkUserId }, "Self-service account deletion failed");
    res.status(500).json({ error: "We could not delete your account. Please try again." });
  }
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

  // URL validation: portfolio must be http(s); avatars must be creator-owned
  // public uploads returned by our authenticated storage endpoint.
  if (parsed.data.portfolioUrl) {
    if (!/^https?:\/\//i.test(parsed.data.portfolioUrl)) {
      res.status(400).json({ error: "Portfolio link must start with http:// or https://" });
      return;
    }
  }
  if (parsed.data.avatarUrl) {
    const isAllowedAvatar = await isOwnedPublicAvatar(userId, parsed.data.avatarUrl);
    if (!isAllowedAvatar) {
      res.status(400).json({ error: "Avatar must be one of your public image uploads." });
      return;
    }
  }

  // Explicit allowlist of self-editable profile fields (never tier/points/isAdmin)
  const updates: Record<string, unknown> = {};
  for (const key of ["username", "avatarUrl", "bio", "discipline", "location", "bookingOpen", "portfolioUrl"] as const) {
    if (parsed.data[key] !== undefined) updates[key] = parsed.data[key];
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No profile fields to update." });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(rawId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const viewerUserId = req.dbUser?.id ?? -1;
  const rows = await db.execute(sql`
    SELECT
      u.id, u.username,
      u.avatar_url AS "avatarUrl",
      u.tier, u.studio_ready_badge AS "studioReadyBadge", u.points,
      u.discipline, u.bio, u.location,
      u.booking_open AS "bookingOpen",
      u.portfolio_url AS "portfolioUrl",
      u.created_at AS "createdAt",
      COUNT(DISTINCT p.id)::int AS "postCount",
      -- Current streak from creator_daily_checkins:
      --   Read the most recent row's streak_day, but only when its local_date is
      --   today or yesterday in the creator's saved timezone.  Otherwise return 0.
      COALESCE((
        SELECT CASE
          WHEN cdc.local_date >= (
            (NOW() AT TIME ZONE COALESCE(NULLIF(u.timezone, ''), 'UTC'))::date - 1
          )
          THEN cdc.streak_day
          ELSE 0
        END
        FROM creator_daily_checkins cdc
        WHERE cdc.user_id = u.id
        ORDER BY cdc.local_date DESC
        LIMIT 1
      ), 0)::int AS "currentStreak",
      (SELECT COUNT(*)::int FROM badges b WHERE b.user_id = u.id) AS "badgesEarned",
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.user_id = u.id) AS "workshopsEnrolled",
      (SELECT COUNT(*)::int FROM user_follows uf WHERE uf.following_id = u.id) AS "followerCount",
      (SELECT COUNT(*)::int FROM user_follows uf WHERE uf.follower_id = u.id) AS "followingCount",
      EXISTS(
        SELECT 1 FROM user_follows viewer_follow
        WHERE viewer_follow.follower_id = ${viewerUserId}
          AND viewer_follow.following_id = u.id
      ) AS "followedByMe",
      EXISTS(
        SELECT 1 FROM user_blocks viewer_block
        WHERE viewer_block.blocker_id = ${viewerUserId}
          AND viewer_block.blocked_id = u.id
      ) AS "blockedByMe",
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', b2.id, 'name', b2.name,
          'imageUrl', b2.image_url,
           'workshopTitle', w2.title,
          'earnedAt', b2.earned_at
        ) ORDER BY b2.earned_at DESC)
         FROM badges b2
         LEFT JOIN workshops w2 ON w2.id = b2.workshop_id
         WHERE b2.user_id = u.id
      ), '[]'::json) AS "recentBadges"
    FROM users u
    LEFT JOIN studio_posts p ON p.user_id = u.id
    WHERE u.id = ${userId}
    GROUP BY u.id
  `);

  if (!rows.rows.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetUserProfileResponse.parse(rows.rows[0]));
});

router.post("/users/:id/follow", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = FollowUserParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const targetUserId = parsed.data.id;
  const followerUserId = req.dbUser.id;
  if (targetUserId === followerUserId) {
    res.status(400).json({ error: "You cannot follow yourself." });
    return;
  }

  const snapshotBeforeInsert = await getFollowSnapshot(targetUserId, followerUserId);
  if (!snapshotBeforeInsert.targetExists) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }
  const blocked = await pool.query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [followerUserId, targetUserId],
  );
  if (blocked.rows.length > 0) {
    res.status(403).json({ error: "Following is unavailable because this creator is blocked." });
    return;
  }

  await pool.query(
    `INSERT INTO user_follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO NOTHING`,
    [followerUserId, targetUserId],
  );
  if (!snapshotBeforeInsert.followedByMe) {
    await createNotification({
      recipientUserId: targetUserId,
      actorUserId: followerUserId,
      type: "follow",
    });
  }
  const snapshot = await getFollowSnapshot(targetUserId, followerUserId);
  res.json(FollowUserResponse.parse({
    targetUserId,
    followerCount: snapshot.followerCount,
    followingCount: snapshot.followingCount,
    followedByMe: snapshot.followedByMe,
  }));
});

router.delete("/users/:id/follow", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UnfollowUserParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const targetUserId = parsed.data.id;
  const followerUserId = req.dbUser.id;
  const snapshotBeforeDelete = await getFollowSnapshot(targetUserId, followerUserId);
  if (!snapshotBeforeDelete.targetExists) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  await pool.query(
    `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
    [followerUserId, targetUserId],
  );
  if (snapshotBeforeDelete.followedByMe) {
    await removeActiveNotification({
      recipientUserId: targetUserId,
      actorUserId: followerUserId,
      type: "follow",
    });
  }
  const snapshot = await getFollowSnapshot(targetUserId, followerUserId);
  res.json(UnfollowUserResponse.parse({
    targetUserId,
    followerCount: snapshot.followerCount,
    followingCount: snapshot.followingCount,
    followedByMe: snapshot.followedByMe,
  }));
});

export default router;

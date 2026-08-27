import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

// GET /studio-posts/:id/comments
router.get("/studio-posts/:id/comments", async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.post_id   AS "postId",
      c.user_id   AS "userId",
      c.content,
      c.parent_id AS "parentId",
      c.created_at AS "createdAt",
      u.username,
      u.avatar_url AS "avatarUrl"
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ${postId}
    ORDER BY c.created_at ASC
  `);

  res.json(rows.rows);
});

// POST /studio-posts/:id/comments
router.post("/studio-posts/:id/comments", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const { content, parentId } = req.body as { content?: string; parentId?: number };
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }
  const postResult = await db.execute(sql`
    SELECT user_id FROM studio_posts WHERE id = ${postId}
  `);
  const postOwnerId = (postResult.rows[0] as { user_id?: number } | undefined)?.user_id;
  if (!postOwnerId) { res.status(404).json({ error: "Post not found" }); return; }
  const blocked = await db.execute(sql`
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = ${userId} AND blocked_id = ${postOwnerId})
       OR (blocker_id = ${postOwnerId} AND blocked_id = ${userId})
    LIMIT 1
  `);
  if (blocked.rows.length > 0) { res.status(403).json({ error: "This creator is blocked." }); return; }

  const result = await db.execute(sql`
    INSERT INTO comments (post_id, user_id, content, parent_id)
    VALUES (${postId}, ${userId}, ${content.trim()}, ${parentId ?? null})
    RETURNING
      id,
      post_id   AS "postId",
      user_id   AS "userId",
      content,
      parent_id AS "parentId",
      created_at AS "createdAt"
  `);

  const comment = result.rows[0] as any;
  await createNotification({
    recipientUserId: postOwnerId,
    actorUserId: userId,
    type: "critique",
    postId,
  });

  // Attach user info
  const userRow = await db.execute(sql`SELECT username, avatar_url AS "avatarUrl" FROM users WHERE id = ${userId}`);
  const user = userRow.rows[0] as any;

  res.status(201).json({ ...comment, username: user?.username, avatarUrl: user?.avatarUrl });
});

export default router;

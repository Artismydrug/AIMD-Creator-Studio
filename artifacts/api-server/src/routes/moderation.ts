import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import {
  BlockUserParams,
  BlockUserResponse,
  CreateContentReportBody,
  CreateContentReportResponse,
  ListModerationReportsResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

const reportReasons = new Set([
  "spam",
  "harassment",
  "hate",
  "sexual_content",
  "violence",
  "scam",
  "other",
]);

async function userExists(userId: number): Promise<boolean> {
  const result = await db.execute(sql`SELECT 1 FROM users WHERE id = ${userId}`);
  return result.rows.length > 0;
}

router.post("/moderation/reports", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateContentReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { postId, userId, messageId, reason, details } = parsed.data;
  if (!reportReasons.has(reason)) {
    res.status(400).json({ error: "Unsupported report reason" });
    return;
  }

  const targetCount = [postId, userId, messageId].filter((value) => value != null).length;
  if (targetCount !== 1) {
    res.status(400).json({ error: "Choose exactly one item to report" });
    return;
  }

  let reportedUserId = userId ?? null;
  if (postId != null) {
    const result = await db.execute(
      sql`SELECT user_id AS "userId" FROM studio_posts WHERE id = ${postId}`,
    );
    const post = result.rows[0] as { userId?: number } | undefined;
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    reportedUserId = post.userId ?? null;
  } else if (messageId != null) {
    const result = await db.execute(
      sql`SELECT sender_id AS "senderId" FROM messages WHERE id = ${messageId}`,
    );
    const message = result.rows[0] as { senderId?: number } | undefined;
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    reportedUserId = message.senderId ?? null;
  } else if (!(await userExists(userId!))) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  if (reportedUserId === req.dbUser.id) {
    res.status(400).json({ error: "You cannot report your own content" });
    return;
  }

  const result = await db.execute(sql`
    INSERT INTO content_reports
      (reporter_id, post_id, reported_user_id, message_id, reason, details)
    VALUES
      (${req.dbUser.id}, ${postId ?? null}, ${reportedUserId}, ${messageId ?? null}, ${reason}, ${details ?? null})
    RETURNING
      id,
      reporter_id AS "reporterId",
      post_id AS "postId",
      reported_user_id AS "reportedUserId",
      message_id AS "messageId",
      reason,
      details,
      status,
      reviewed_by AS "reviewedBy",
      reviewed_at AS "reviewedAt",
      created_at AS "createdAt"
  `);

  res.status(201).json(CreateContentReportResponse.parse(result.rows[0]));
});

router.get("/moderation/reports", requireAdmin, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      r.id,
      r.reporter_id AS "reporterId",
      reporter.username AS "reporterName",
      r.post_id AS "postId",
      r.reported_user_id AS "reportedUserId",
      reported.username AS "reportedUserName",
      r.message_id AS "messageId",
      r.reason,
      r.details,
      r.status,
      r.reviewed_by AS "reviewedBy",
      r.reviewed_at AS "reviewedAt",
      r.created_at AS "createdAt"
    FROM content_reports r
    JOIN users reporter ON reporter.id = r.reporter_id
    LEFT JOIN users reported ON reported.id = r.reported_user_id
    ORDER BY r.created_at DESC
    LIMIT 200
  `);
  res.json(ListModerationReportsResponse.parse(result.rows));
});

router.post("/users/:id/block", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = BlockUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.id === req.dbUser.id) {
    res.status(400).json({ error: "You cannot block yourself" });
    return;
  }
  if (!(await userExists(parsed.data.id))) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  await db.execute(sql`
    INSERT INTO user_blocks (blocker_id, blocked_id)
    VALUES (${req.dbUser.id}, ${parsed.data.id})
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING
  `);
  await db.execute(sql`
    DELETE FROM user_follows
    WHERE (follower_id = ${req.dbUser.id} AND following_id = ${parsed.data.id})
       OR (follower_id = ${parsed.data.id} AND following_id = ${req.dbUser.id})
  `);

  res.json(BlockUserResponse.parse({ userId: parsed.data.id, blockedByMe: true }));
});

router.delete("/users/:id/block", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = BlockUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.execute(sql`
    DELETE FROM user_blocks
    WHERE blocker_id = ${req.dbUser.id} AND blocked_id = ${parsed.data.id}
  `);
  res.json(BlockUserResponse.parse({ userId: parsed.data.id, blockedByMe: false }));
});

export default router;
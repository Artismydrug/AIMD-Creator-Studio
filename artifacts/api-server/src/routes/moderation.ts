import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import {
  BlockUserParams,
  BlockUserResponse,
  CreateContentReportBody,
  CreateContentReportResponse,
  ListModerationReportsResponse,
  ReviewModerationReportBody,
  ReviewModerationReportParams,
  ReviewModerationReportResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

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
      sql`SELECT m.sender_id AS "senderId" FROM messages m
          WHERE m.id = ${messageId} AND EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = m.conversation_id AND cp.user_id = ${req.dbUser.id}
          )`,
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

const reportSelection = sql`
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
      r.created_at AS "createdAt",
      CASE WHEN r.post_id IS NOT NULL THEN p.caption
           WHEN r.message_id IS NOT NULL THEN m.content
           ELSE reported.bio END AS "contentText",
      p.image_url AS "mediaUrl",
      p.media_type AS "mediaType",
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', h.id, 'action', h.action, 'note', h.note,
          'reviewerId', h.reviewer_id, 'reviewerName', reviewer.username,
          'createdAt', h.created_at
        ) ORDER BY h.created_at, h.id)
        FROM content_report_reviews h
        LEFT JOIN users reviewer ON reviewer.id = h.reviewer_id
        WHERE h.report_id = r.id
      ), '[]'::json) AS "reviewHistory"
    FROM content_reports r
    JOIN users reporter ON reporter.id = r.reporter_id
    LEFT JOIN users reported ON reported.id = r.reported_user_id
    LEFT JOIN studio_posts p ON p.id = r.post_id
    LEFT JOIN messages m ON m.id = r.message_id
`;

router.get("/moderation/reports", requireAdmin, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`${reportSelection}
    ORDER BY (r.status IN ('open', 'reviewing')) DESC,
      CASE WHEN r.status IN ('open', 'reviewing') THEN r.created_at END ASC,
      r.created_at DESC
    LIMIT 200
  `);
  res.json(ListModerationReportsResponse.parse(result.rows));
});

class ReviewError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

router.patch("/moderation/reports/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = ReviewModerationReportParams.safeParse(req.params);
  const body = ReviewModerationReportBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.note.trim()) {
    res.status(400).json({ error: "A valid report, action, and nonblank review note are required" });
    return;
  }
  const { action } = body.data;
  const note = body.data.note.trim();
  const reportId = params.data.id;
  const reviewerId = req.dbUser!.id;
  try {
    await db.transaction(async (tx) => {
      const locked = await tx.execute(sql`
        SELECT id, post_id AS "postId", message_id AS "messageId", status
        FROM content_reports WHERE id = ${reportId} FOR UPDATE
      `);
      const report = locked.rows[0] as {
        id: number; postId: number | null; messageId: number | null; status: string;
      } | undefined;
      if (!report) throw new ReviewError(404, "Report not found");
      if (report.status === "resolved" || report.status === "dismissed") {
        throw new ReviewError(409, "Report is already closed; refresh to see the staff review");
      }

      if (action === "remove_content") {
        if (report.postId != null) {
          const result = await tx.execute(sql`
            SELECT image_url AS "mediaUrl", user_id AS "ownerId"
            FROM studio_posts WHERE id = ${report.postId} FOR UPDATE
          `);
          const post = result.rows[0] as { mediaUrl: string | null; ownerId: number } | undefined;
          if (!post) throw new ReviewError(404, "Reported post no longer exists");
          // Fail closed if owned-media withdrawal fails. Shared/external media
          // is not modified; its reported post is still removed from this app.
          if (post.mediaUrl) {
            await objectStorageService.revokePublicObjectEntityIfOwned(post.mediaUrl, String(post.ownerId));
          }
          await tx.execute(sql`DELETE FROM studio_posts WHERE id = ${report.postId}`);
        } else if (report.messageId != null) {
          const deleted = await tx.execute(sql`DELETE FROM messages WHERE id = ${report.messageId} RETURNING id`);
          if (!deleted.rows.length) throw new ReviewError(404, "Reported message no longer exists");
        } else {
          throw new ReviewError(400, "Creator reports cannot delete an account; remove a specific reported post or message instead");
        }
      }

      const status = action === "review" ? "reviewing" : action === "dismiss" ? "dismissed" : "resolved";
      await tx.execute(sql`
        INSERT INTO content_report_reviews (report_id, reviewer_id, action, note)
        VALUES (${reportId}, ${reviewerId}, ${action}, ${note})
      `);
      await tx.execute(sql`
        UPDATE content_reports SET status = ${status}, reviewed_by = ${reviewerId}, reviewed_at = now()
        WHERE id = ${reportId}
      `);
    });
  } catch (error) {
    if (error instanceof ReviewError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
  const result = await db.execute(sql`${reportSelection} WHERE r.id = ${reportId}`);
  res.json(ReviewModerationReportResponse.parse(result.rows[0]));
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
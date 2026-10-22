import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  GetNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser.id;
  const result = await db.execute(sql`
    SELECT n.id, n.type, n.conversation_id AS "conversationId",
           n.post_id AS "postId", n.created_at AS "createdAt", n.read_at AS "readAt",
           CASE WHEN n.booking_id IS NULL THEN NULL ELSE json_build_object(
             'bookingId', n.booking_id
           ) END AS "inquiryDestination",
           CASE WHEN n.booking_id IS NULL OR inquiry.id IS NULL THEN NULL ELSE
             'New Commission Inquiry: ' || inquiry.name || ' requested a ' ||
             CASE inquiry.request_type
               WHEN 'tattoo' THEN 'tattoo'
               WHEN 'painting' THEN 'painting'
                WHEN 'other' THEN 'creative'
                ELSE inquiry.request_type
             END || ' project'
           END AS "inquirySummary",
           CASE WHEN n.actor_user_id IS NULL THEN NULL ELSE json_build_object(
             'id', actor.id, 'username', actor.username, 'avatarUrl', actor.avatar_url
           ) END AS actor,
           CASE WHEN n.conversation_id IS NULL THEN NULL ELSE json_build_object(
             'conversationId', n.conversation_id
           ) END AS "conversationDestination",
           CASE WHEN n.post_id IS NULL THEN NULL ELSE json_build_object(
             'postId', n.post_id
           ) END AS "postDestination",
           COUNT(*) FILTER (WHERE n.read_at IS NULL) OVER ()::int AS "unreadCount"
    FROM notifications n
    LEFT JOIN users actor ON actor.id = n.actor_user_id
    LEFT JOIN tattoo_bookings inquiry ON inquiry.id = n.booking_id
    WHERE n.recipient_user_id = ${userId}
      AND n.type NOT IN ('like', 'critique')
    ORDER BY n.created_at DESC
    LIMIT 100
  `);
  const rows = result.rows;
  res.json(GetNotificationsResponse.parse({
    notifications: rows.map(({ unreadCount: _unreadCount, ...notification }) => notification),
    unreadCount: Number((rows[0] as { unreadCount?: number } | undefined)?.unreadCount ?? 0),
  }));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = MarkNotificationReadParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE notifications SET read_at = COALESCE(read_at, now())
      WHERE id = ${parsed.data.id} AND recipient_user_id = ${req.dbUser.id}
      RETURNING *
    )
    SELECT n.id, n.type, n.conversation_id AS "conversationId",
      n.post_id AS "postId", n.created_at AS "createdAt", n.read_at AS "readAt",
      CASE WHEN n.booking_id IS NULL THEN NULL ELSE json_build_object(
        'bookingId', n.booking_id
      ) END AS "inquiryDestination",
      CASE WHEN n.booking_id IS NULL OR inquiry.id IS NULL THEN NULL ELSE
        'New Commission Inquiry: ' || inquiry.name || ' requested a ' ||
        CASE inquiry.request_type
          WHEN 'tattoo' THEN 'tattoo'
          WHEN 'painting' THEN 'painting'
          WHEN 'other' THEN 'creative'
          ELSE inquiry.request_type
        END || ' project'
      END AS "inquirySummary",
      CASE WHEN n.actor_user_id IS NULL THEN NULL ELSE json_build_object(
        'id', actor.id, 'username', actor.username, 'avatarUrl', actor.avatar_url
      ) END AS actor,
      CASE WHEN n.conversation_id IS NULL THEN NULL ELSE json_build_object(
        'conversationId', n.conversation_id
      ) END AS "conversationDestination",
      CASE WHEN n.post_id IS NULL THEN NULL ELSE json_build_object(
        'postId', n.post_id
      ) END AS "postDestination"
    FROM updated n
    LEFT JOIN users actor ON actor.id = n.actor_user_id
    LEFT JOIN tattoo_bookings inquiry ON inquiry.id = n.booking_id
  `);
  if (!result.rows[0]) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(MarkNotificationReadResponse.parse(result.rows[0]));
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const result = await db.execute(sql`
    UPDATE notifications SET read_at = now()
    WHERE recipient_user_id = ${req.dbUser.id} AND read_at IS NULL
    RETURNING id
  `);
  res.json(MarkAllNotificationsReadResponse.parse({ updatedCount: result.rows.length }));
});

export default router;
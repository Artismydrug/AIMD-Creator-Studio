import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { deliverNotificationPush } from "./expoPush";

export type NotificationType = "direct_message" | "follow" | "like" | "critique";

/**
 * Creates an alert only when the actor and recipient can interact. The block
 * check is repeated here so callers cannot accidentally leak activity through
 * a notification when their own authorization logic changes.
 */
export async function createNotification({
  recipientUserId,
  actorUserId,
  type,
  conversationId,
  postId,
}: {
  recipientUserId: number;
  actorUserId?: number | null;
  type: NotificationType;
  conversationId?: number | null;
  postId?: number | null;
}): Promise<void> {
  if (recipientUserId === actorUserId) return;

  const inserted = await db.execute(sql`
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, type, conversation_id, post_id
    )
    SELECT ${recipientUserId}, ${actorUserId ?? null}, ${type},
           ${conversationId ?? null}, ${postId ?? null}
    WHERE NOT EXISTS (
      SELECT 1 FROM user_blocks
      WHERE (blocker_id = ${recipientUserId} AND blocked_id = ${actorUserId ?? null})
         OR (blocker_id = ${actorUserId ?? null} AND blocked_id = ${recipientUserId})
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  if (inserted.rows.length) {
    void deliverNotificationPush(recipientUserId, type, conversationId).catch(() => {
      // Push failure must never turn a successfully saved message into a retry.
      console.warn("Push delivery failed; notification remains in the app inbox.");
    });
  }
}

export async function removeActiveNotification({
  recipientUserId,
  actorUserId,
  type,
  postId,
}: {
  recipientUserId: number;
  actorUserId: number;
  type: "follow" | "like";
  postId?: number;
}): Promise<void> {
  await db.execute(sql`
    DELETE FROM notifications
    WHERE recipient_user_id = ${recipientUserId}
      AND actor_user_id = ${actorUserId}
      AND type = ${type}
      AND read_at IS NULL
      AND (${postId ?? null}::integer IS NULL OR post_id = ${postId ?? null})
  `);
}
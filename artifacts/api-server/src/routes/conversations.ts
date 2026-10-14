import { Router, type IRouter } from "express";
import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

// GET /conversations — list conversations for current user with last message + participant info
router.get("/conversations", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.is_group AS "isGroup",
      c.created_at AS "createdAt",
      -- Last message
      (
        SELECT json_build_object(
          'id', m.id,
          'content', m.content,
          'senderId', m.sender_id,
          'senderName', u2.username,
          'createdAt', m.created_at
        )
        FROM messages m
        JOIN users u2 ON u2.id = m.sender_id
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS "lastMessage",
      -- Other participants (excluding self for DMs)
      (
        SELECT json_agg(json_build_object(
          'userId', cp2.user_id,
          'username', u3.username,
          'avatarUrl', u3.avatar_url,
          'tier', u3.tier
        ))
        FROM conversation_participants cp2
        JOIN users u3 ON u3.id = cp2.user_id
        WHERE cp2.conversation_id = c.id AND cp2.user_id != ${userId}
      ) AS "participants",
      -- Unread count
      (
        SELECT count(*)::int
        FROM messages m2
        JOIN conversation_participants cp3 ON cp3.conversation_id = m2.conversation_id AND cp3.user_id = ${userId}
        WHERE m2.conversation_id = c.id
          AND m2.sender_id != ${userId}
          AND (cp3.last_read_at IS NULL OR m2.created_at > cp3.last_read_at)
      ) AS "unreadCount"
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ${userId}
    WHERE NOT EXISTS (
      SELECT 1
      FROM conversation_participants blocked_cp
      JOIN user_blocks ub ON (
        (ub.blocker_id = ${userId} AND ub.blocked_id = blocked_cp.user_id)
        OR (ub.blocker_id = blocked_cp.user_id AND ub.blocked_id = ${userId})
      )
      WHERE blocked_cp.conversation_id = c.id
    )
    ORDER BY (
      SELECT max(m.created_at) FROM messages m WHERE m.conversation_id = c.id
    ) DESC NULLS LAST
  `);

  res.json(rows.rows);
});

// POST /conversations — start a new conversation
router.post("/conversations", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const { participantIds, name } = req.body as { participantIds?: number[]; name?: string };
  if (!Array.isArray(participantIds) || participantIds.length === 0 ||
    participantIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    res.status(400).json({ error: "participantIds required" }); return;
  }

  const allIds = [...new Set([userId, ...participantIds])];
  if (allIds.length < 2) { res.status(400).json({ error: "Another participant is required" }); return; }
  const isGroup = allIds.length > 2;
  const participantIdArray = sql`ARRAY[${sql.join(
    allIds.map((id) => sql`${id}`),
    sql`, `,
  )}]::int[]`;
  const blocked = await db.execute(sql`
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = ${userId} AND blocked_id = ANY(${participantIdArray}))
       OR (blocked_id = ${userId} AND blocker_id = ANY(${participantIdArray}))
    LIMIT 1
  `);
  if (blocked.rows.length > 0) {
    res.status(403).json({ error: "Messaging is unavailable because this creator is blocked." });
    return;
  }

  const conversation = await db.transaction(async (tx) => {
    // Serialize both directions of the same DM across all API instances.
    // The lookup and participant inserts must share the same transaction.
    if (!isGroup) {
      const otherId = allIds.find(id => id !== userId)!;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${Math.min(userId, otherId)}::int, ${Math.max(userId, otherId)}::int)`);
      const existing = await tx.execute(sql`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ${userId}
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ${otherId}
      WHERE c.is_group = false
      LIMIT 1
      `);
      if (existing.rows.length > 0) {
        return { id: (existing.rows[0] as { id: number }).id, existing: true };
      }
    }
    const convResult = await tx.execute(sql`
      INSERT INTO conversations (name, is_group) VALUES (${typeof name === "string" ? name : null}, ${isGroup})
      RETURNING id
    `);
    const convId = (convResult.rows[0] as { id: number }).id;
    for (const uid of allIds) await tx.execute(sql`
      INSERT INTO conversation_participants (conversation_id, user_id) VALUES (${convId}, ${uid})
      ON CONFLICT DO NOTHING
    `);
    return { id: convId, existing: false };
  });

  res.status(conversation.existing ? 200 : 201).json(conversation);
});

// GET /conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const convId = parseInt(req.params.id);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Verify participant
  const check = await db.execute(sql`
    SELECT 1 FROM conversation_participants WHERE conversation_id = ${convId} AND user_id = ${userId}
  `);
  if (check.rows.length === 0) { res.status(403).json({ error: "Not a participant" }); return; }
  const blocked = await db.execute(sql`
    SELECT 1
    FROM conversation_participants cp
    JOIN user_blocks ub ON (
      (ub.blocker_id = ${userId} AND ub.blocked_id = cp.user_id)
      OR (ub.blocker_id = cp.user_id AND ub.blocked_id = ${userId})
    )
    WHERE cp.conversation_id = ${convId} AND cp.user_id != ${userId}
    LIMIT 1
  `);
  if (blocked.rows.length > 0) {
    res.status(403).json({ error: "Messaging is unavailable because this creator is blocked." });
    return;
  }

  // Mark as read
  await db.execute(sql`
    UPDATE conversation_participants SET last_read_at = NOW()
    WHERE conversation_id = ${convId} AND user_id = ${userId}
  `);

  const rows = await db.execute(sql`
    SELECT
      m.id,
      m.conversation_id AS "conversationId",
      m.sender_id AS "senderId",
      m.content,
      m.created_at AS "createdAt",
      u.username AS "senderName",
      u.avatar_url AS "senderAvatar"
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${convId}
    ORDER BY m.created_at ASC
  `);

  res.json(rows.rows);
});

// POST /conversations/:id/messages
router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

   const convId = Number(req.params.id);
   if (!Number.isSafeInteger(convId) || convId <= 0) { res.status(400).json({ error: "Invalid id" }); return; }

   const parsed = SendMessageBody.safeParse(req.body);
   if (!parsed.success || !parsed.data.content.trim()) {
     res.status(400).json({ error: "Valid message content and request identity required" }); return;
   }
   const content = parsed.data.content.trim();
   const clientRequestId = parsed.data.clientRequestId;

  // Verify participant
  const check = await db.execute(sql`
    SELECT 1 FROM conversation_participants WHERE conversation_id = ${convId} AND user_id = ${userId}
  `);
  if (check.rows.length === 0) { res.status(403).json({ error: "Not a participant" }); return; }
  const blocked = await db.execute(sql`
    SELECT 1
    FROM conversation_participants cp
    JOIN user_blocks ub ON (
      (ub.blocker_id = ${userId} AND ub.blocked_id = cp.user_id)
      OR (ub.blocker_id = cp.user_id AND ub.blocked_id = ${userId})
    )
    WHERE cp.conversation_id = ${convId} AND cp.user_id != ${userId}
    LIMIT 1
  `);
  if (blocked.rows.length > 0) {
    res.status(403).json({ error: "Messaging is unavailable because this creator is blocked." });
    return;
  }

   const fingerprint = createHash("sha256").update(`${convId}\0${content}`).digest("hex");
   const result = await db.transaction(async (tx) => {
     if (clientRequestId) {
       const claimed = await tx.execute(sql`
         INSERT INTO message_send_receipts (sender_id, client_request_id, fingerprint)
         VALUES (${userId}, ${clientRequestId}::uuid, ${fingerprint})
         ON CONFLICT (sender_id, client_request_id) DO NOTHING RETURNING sender_id
       `);
       if (claimed.rows.length === 0) {
         const receipt = await tx.execute(sql`
           SELECT fingerprint, message_id FROM message_send_receipts
           WHERE sender_id = ${userId} AND client_request_id = ${clientRequestId}::uuid
         `);
         const saved = receipt.rows[0] as { fingerprint: string; message_id: number };
         return saved.fingerprint === fingerprint
           ? { messageId: saved.message_id, created: false, conflict: false }
           : { messageId: null, created: false, conflict: true };
       }
     }
     const inserted = await tx.execute(sql`
       INSERT INTO messages (conversation_id, sender_id, content)
       VALUES (${convId}, ${userId}, ${content}) RETURNING id
     `);
     const messageId = (inserted.rows[0] as { id: number }).id;
     if (clientRequestId) await tx.execute(sql`
       UPDATE message_send_receipts SET message_id = ${messageId}
       WHERE sender_id = ${userId} AND client_request_id = ${clientRequestId}::uuid
     `);
     return { messageId, created: true, conflict: false };
   });
   if (result.conflict) {
     res.status(409).json({ error: "This send identity has already been used for a different message." }); return;
   }
   const message = await db.execute(sql`
     SELECT id, conversation_id AS "conversationId", sender_id AS "senderId", content, created_at AS "createdAt"
     FROM messages WHERE id = ${result.messageId} AND sender_id = ${userId} AND conversation_id = ${convId}
   `);
   if (!message.rows[0]) {
     res.status(410).json({ error: "The previously sent message is no longer available." }); return;
   }
   const msg = message.rows[0];
  const recipients = await db.execute(sql`
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = ${convId} AND user_id != ${userId}
  `);
   if (result.created) await Promise.all(
    recipients.rows.map((row) => createNotification({
      recipientUserId: (row as { user_id: number }).user_id,
      actorUserId: userId,
      type: "direct_message",
      conversationId: convId,
    })),
  );
  const userRow = await db.execute(sql`SELECT username, avatar_url AS "senderAvatar" FROM users WHERE id = ${userId}`);
  const u = userRow.rows[0] as any;

  res.status(201).json({ ...msg, senderName: u?.username, senderAvatar: u?.senderAvatar });
});

export default router;

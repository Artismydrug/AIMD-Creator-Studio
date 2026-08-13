import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    res.status(400).json({ error: "participantIds required" }); return;
  }

  const allIds = [...new Set([userId, ...participantIds])];
  const isGroup = allIds.length > 2;

  // For DMs: check if conversation already exists between these two users
  if (!isGroup) {
    const otherId = participantIds[0];
    const existing = await db.execute(sql`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ${userId}
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ${otherId}
      WHERE c.is_group = false
      LIMIT 1
    `);
    if (existing.rows.length > 0) {
      res.json({ id: (existing.rows[0] as any).id, existing: true });
      return;
    }
  }

  const convResult = await db.execute(sql`
    INSERT INTO conversations (name, is_group) VALUES (${name ?? null}, ${isGroup})
    RETURNING id
  `);
  const convId = (convResult.rows[0] as any).id;

  for (const uid of allIds) {
    await db.execute(sql`
      INSERT INTO conversation_participants (conversation_id, user_id) VALUES (${convId}, ${uid})
      ON CONFLICT DO NOTHING
    `);
  }

  res.status(201).json({ id: convId, existing: false });
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

  const convId = parseInt(req.params.id);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  // Verify participant
  const check = await db.execute(sql`
    SELECT 1 FROM conversation_participants WHERE conversation_id = ${convId} AND user_id = ${userId}
  `);
  if (check.rows.length === 0) { res.status(403).json({ error: "Not a participant" }); return; }

  const result = await db.execute(sql`
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (${convId}, ${userId}, ${content.trim()})
    RETURNING id, conversation_id AS "conversationId", sender_id AS "senderId", content, created_at AS "createdAt"
  `);

  const msg = result.rows[0] as any;
  const userRow = await db.execute(sql`SELECT username, avatar_url AS "senderAvatar" FROM users WHERE id = ${userId}`);
  const u = userRow.rows[0] as any;

  res.status(201).json({ ...msg, senderName: u?.username, senderAvatar: u?.senderAvatar });
});

export default router;

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const validExpoPushToken = (token: string) =>
  /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{8,256}\]$/.test(token);

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { type: "direct_message" | "follow"; recipientUserId?: number; conversationId?: number };
  sound: "default";
  channelId: string;
};

// Ticket errors are checked immediately. Provider delivery is not guaranteed,
// so the database inbox remains the authoritative notification history.
export async function sendExpoPushBatch(messages: PushMessage[], transport: typeof fetch = fetch): Promise<string[]> {
  const revoked: string[] = [];
  for (let start = 0; start < messages.length; start += 100) {
    const batch = messages.slice(start, start + 100);
    const response = await transport("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`Push provider returned HTTP ${response.status}`);
    const result = await response.json() as {
      data?: { status: string; details?: { error?: string } }[];
    };
    if (!Array.isArray(result.data) || result.data.length !== batch.length) {
      throw new Error("Push provider returned an invalid ticket response");
    }
    result.data.forEach((ticket, index) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        revoked.push(batch[index].to);
      } else if (ticket.status === "error") {
        console.warn("Push notification ticket was rejected", ticket.details?.error ?? "UnknownError");
      }
    });
  }
  return revoked;
}

export async function deliverNotificationPush(
  recipientUserId: number,
  type: string,
  conversationId?: number | null,
) {
  if (type !== "direct_message" && type !== "follow") return;
  const devices = await db.execute(sql`
    SELECT d.expo_push_token AS token
    FROM notification_push_devices d
    JOIN user_notification_preferences p ON p.user_id = d.user_id
    WHERE d.user_id = ${recipientUserId}
      AND CASE WHEN ${type} = 'direct_message' THEN p.direct_messages ELSE p.new_followers END
  `);
  const messages: PushMessage[] = devices.rows
    .map((row) => String(row.token))
    .filter(validExpoPushToken)
    .map((token) => ({
      to: token,
      title: type === "direct_message" ? "New Creator Studio message" : "New Creator Studio follower",
      // Do not expose message text or another creator's identity on a lock screen.
      body: "Open Creator Studio to see your notification.",
      data: {
        type,
        recipientUserId,
        ...(type === "direct_message" && conversationId ? { conversationId } : {}),
      },
      sound: "default",
      channelId: "creator-studio-updates",
    }));
  if (!messages.length) return;
  const revoked = await sendExpoPushBatch(messages);
  for (const token of revoked) {
    await db.execute(sql`DELETE FROM notification_push_devices WHERE expo_push_token = ${token}`);
  }
}

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesBody,
  UpdateNotificationPreferencesResponse,
  RegisterNotificationDeviceBody,
  UnregisterNotificationDeviceBody,
} from "@workspace/api-zod";
import { validExpoPushToken } from "../lib/expoPush";

const router: IRouter = Router();

router.get("/notification-preferences", async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const result = await db.execute(sql`
    SELECT direct_messages AS "directMessages", new_followers AS "newFollowers"
    FROM user_notification_preferences WHERE user_id = ${req.dbUser.id}
  `);
  res.json(GetNotificationPreferencesResponse.parse(result.rows[0] ?? {
    directMessages: false, newFollowers: false,
  }));
});

router.patch("/notification-preferences", async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UpdateNotificationPreferencesBody.strict().safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data).length) {
    res.status(400).json({ error: "Choose at least one valid notification preference." }); return;
  }
  const { directMessages, newFollowers } = parsed.data;
  const result = await db.execute(sql`
    INSERT INTO user_notification_preferences (user_id, direct_messages, new_followers)
    VALUES (${req.dbUser.id}, ${directMessages ?? false}, ${newFollowers ?? false})
    ON CONFLICT (user_id) DO UPDATE SET
      direct_messages = CASE WHEN ${directMessages !== undefined} THEN ${directMessages ?? false}
        ELSE user_notification_preferences.direct_messages END,
      new_followers = CASE WHEN ${newFollowers !== undefined} THEN ${newFollowers ?? false}
        ELSE user_notification_preferences.new_followers END,
      updated_at = now()
    RETURNING direct_messages AS "directMessages", new_followers AS "newFollowers"
  `);
  res.json(UpdateNotificationPreferencesResponse.parse(result.rows[0]));
});

router.post("/notification-devices", async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = RegisterNotificationDeviceBody.strict().safeParse(req.body);
  if (!parsed.success || !validExpoPushToken(parsed.data.expoPushToken)) {
    res.status(400).json({ error: "A valid Expo push token and device platform are required." }); return;
  }
  await db.execute(sql`
    INSERT INTO notification_push_devices (user_id, expo_push_token, platform)
    VALUES (${req.dbUser.id}, ${parsed.data.expoPushToken}, ${parsed.data.platform})
    ON CONFLICT (expo_push_token) DO UPDATE SET
      user_id = excluded.user_id, platform = excluded.platform, updated_at = now()
  `);
  res.json({ ok: true });
});

router.delete("/notification-devices", async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UnregisterNotificationDeviceBody.strict().safeParse(req.body);
  if (!parsed.success || !validExpoPushToken(parsed.data.expoPushToken)) {
    res.status(400).json({ error: "A valid Expo push token and device platform are required." }); return;
  }
  await db.execute(sql`
    DELETE FROM notification_push_devices
    WHERE user_id = ${req.dbUser.id} AND expo_push_token = ${parsed.data.expoPushToken}
  `);
  res.json({ ok: true });
});

export default router;

import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, lte } from "drizzle-orm";
import { db, pool, smsSubscriptionsTable } from "@workspace/db";
import {
  CreateSmsSubscriptionBody,
  CreateSmsSubscriptionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CONFIRMATION_COOLDOWN_SECONDS = 60;
const REQUESTER_WINDOW_SECONDS = 60 * 60;
const MAX_DISTINCT_PHONES_PER_REQUESTER = 3;
const CONFIRMATION_TEXT =
  "Art Is My Drug: Reply YES to confirm you want promotional texts from AIMD. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out.";

type SmsReplyAction = "yes" | "stop" | "help";

export function normalizeUsPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}

function requestKey(ip: string | undefined, phone: string): string {
  return createHash("sha256")
    .update(`${process.env.SESSION_SECRET || "aimd-sms"}|${ip || "unknown"}|${phone}`)
    .digest("hex");
}

function requesterKey(req: { ip?: string; get(name: string): string | undefined }): string {
  const secret = process.env.SESSION_SECRET || "aimd-sms";
  return createHash("sha256")
    .update(`${secret}|${req.ip || "unknown"}|${req.get("user-agent") || "unknown"}`)
    .digest("hex");
}

async function claimConfirmationAttempt(
  key: string,
  requester: string,
  phoneE164: string,
): Promise<"claimed" | "phone_cooldown" | "requester_limit"> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [requester]);

    const currentPhone = await client.query(
      `SELECT 1
         FROM sms_confirmation_attempts
        WHERE requester_key = $1
          AND phone_e164 = $2
          AND last_attempt_at > NOW() - ($3 * INTERVAL '1 second')
        LIMIT 1`,
      [requester, phoneE164, REQUESTER_WINDOW_SECONDS],
    );
    const distinctPhones = await client.query<{ count: string }>(
      `SELECT COUNT(DISTINCT phone_e164)::text AS count
         FROM sms_confirmation_attempts
        WHERE requester_key = $1
          AND last_attempt_at > NOW() - ($2 * INTERVAL '1 second')`,
      [requester, REQUESTER_WINDOW_SECONDS],
    );
    if (
      currentPhone.rowCount === 0 &&
      Number(distinctPhones.rows[0]?.count || 0) >= MAX_DISTINCT_PHONES_PER_REQUESTER
    ) {
      await client.query("ROLLBACK");
      return "requester_limit";
    }

    const claimed = await client.query(
      `INSERT INTO sms_confirmation_attempts
         (request_key, requester_key, phone_e164, last_attempt_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (request_key) DO UPDATE
         SET requester_key = EXCLUDED.requester_key,
             phone_e164 = EXCLUDED.phone_e164,
             last_attempt_at = EXCLUDED.last_attempt_at
         WHERE sms_confirmation_attempts.last_attempt_at
               <= EXCLUDED.last_attempt_at - ($4 * INTERVAL '1 second')
       RETURNING id`,
      [key, requester, phoneE164, CONFIRMATION_COOLDOWN_SECONDS],
    );
    await client.query("COMMIT");
    return claimed.rowCount === 1 ? "claimed" : "phone_cooldown";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function providerSecret(): string | null {
  return (
    process.env.AIMD_SMS_WEBHOOK_SECRET?.trim() ||
    process.env.AIMD_SMS_SUBSCRIBE_TOKEN?.trim() ||
    null
  );
}

function hasValidProviderSecret(req: Request): boolean {
  const configured = providerSecret();
  if (!configured) return false;

  const authorization = req.get("authorization");
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : req.get("x-aimd-sms-secret")?.trim();
  if (!supplied) return false;

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

function providerCallbackUrl(): string | null {
  const raw = process.env.AIMD_SMS_STATUS_WEBHOOK_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.pathname !== "/api/webhooks/aimd-sms"
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function eventPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? { ...payload, ...(payload.data as Record<string, unknown>) }
    : payload;
}

function stringField(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function actionFromValues(values: string[]): SmsReplyAction | null {
  for (const value of values) {
    const normalized = value.toLowerCase().replace(/[^a-z]+/g, " ").trim();
    if (
      normalized === "yes" ||
      normalized.includes("confirmed") ||
      normalized.includes("opt in") ||
      normalized.includes("opted in")
    ) {
      return "yes";
    }
    if (
      normalized === "stop" ||
      normalized.includes("opt out") ||
      normalized.includes("opted out") ||
      normalized.includes("unsubscribed")
    ) {
      return "stop";
    }
    if (normalized === "help" || normalized.includes("help requested")) {
      return "help";
    }
  }
  return null;
}

function getReplyAction(payload: Record<string, unknown>): SmsReplyAction | null {
  const flattened = eventPayload(payload);
  const values = [
    "keyword",
    "reply",
    "message",
    "body",
    "text",
    "action",
    "event",
    "type",
    "status",
  ].flatMap((key) => {
    const value = flattened[key];
    return typeof value === "string" && value.trim() ? [value] : [];
  });
  return actionFromValues(values);
}

function parseProviderEventAt(value: unknown): Date | null {
  const date =
    typeof value === "number"
      ? new Date(value < 10_000_000_000 ? value * 1_000 : value)
      : typeof value === "string" && value.trim()
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  if (date.getTime() > Date.now() + 5 * 60_000) return null;
  return date;
}

async function handleProviderWebhook(req: Request, res: Response): Promise<void> {
  if (!hasValidProviderSecret(req)) {
    res.status(providerSecret() ? 401 : 503).json({
      error: providerSecret()
        ? "Invalid SMS provider credentials."
        : "SMS provider webhook secret is not configured.",
    });
    return;
  }

  const payload =
    req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const flattened = eventPayload(payload);
  const phone = normalizeUsPhone(
    stringField(flattened, "phone", "phoneE164", "phoneNumber", "from", "mobile") || "",
  );
  const action = getReplyAction(payload);
  const providerEventAt = parseProviderEventAt(
    flattened.occurredAt ??
      flattened.occurred_at ??
      flattened.eventAt ??
      flattened.event_at ??
      flattened.timestamp,
  );
  if (!phone || !action || !providerEventAt) {
    res.status(400).json({
      error: "A valid phone number, event timestamp, and YES, STOP, or HELP event are required.",
    });
    return;
  }

  const [subscription] = await db
    .select()
    .from(smsSubscriptionsTable)
    .where(eq(smsSubscriptionsTable.phoneE164, phone))
    .limit(1);
  if (!subscription) {
    res.status(202).json({ received: true, matched: false });
    return;
  }

  const now = new Date();
  let consentStatus = subscription.consentStatus;
  let ignored = false;

  if (action === "yes") {
    const [confirmed] = await db
      .update(smsSubscriptionsTable)
      .set({
        consentStatus: "confirmed",
        confirmedAt: providerEventAt,
        confirmationError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(smsSubscriptionsTable.id, subscription.id),
          eq(smsSubscriptionsTable.consentStatus, "pending"),
          lte(smsSubscriptionsTable.consentRequestedAt, providerEventAt),
        ),
      )
      .returning({ consentStatus: smsSubscriptionsTable.consentStatus });

    if (confirmed) {
      consentStatus = confirmed.consentStatus;
    } else {
      ignored = true;
      const [current] = await db
        .select({ consentStatus: smsSubscriptionsTable.consentStatus })
        .from(smsSubscriptionsTable)
        .where(eq(smsSubscriptionsTable.id, subscription.id))
        .limit(1);
      consentStatus = current?.consentStatus || subscription.consentStatus;
    }
  } else if (action === "stop") {
    const [optedOut] = await db
      .update(smsSubscriptionsTable)
      .set({
        consentStatus: "opted_out",
        optedOutAt: providerEventAt,
        confirmationError: null,
        updatedAt: now,
      })
      .where(eq(smsSubscriptionsTable.id, subscription.id))
      .returning({ consentStatus: smsSubscriptionsTable.consentStatus });
    consentStatus = optedOut?.consentStatus || subscription.consentStatus;
  } else {
    await db
      .update(smsSubscriptionsTable)
      .set({
        helpRequestedAt: providerEventAt,
        updatedAt: now,
      })
      .where(eq(smsSubscriptionsTable.id, subscription.id));
  }

  res.status(200).json({
    received: true,
    matched: true,
    action,
    ignored,
    reason: ignored ? "not_pending_or_stale" : undefined,
    consentStatus,
  });
}

router.post("/sms/subscriptions", async (req, res): Promise<void> => {
  const parsed = CreateSmsSubscriptionBody.safeParse(req.body);
  if (!parsed.success || parsed.data.consentAccepted !== true) {
    res.status(400).json({ error: "A valid name, mobile number, and consent are required." });
    return;
  }

  const phoneE164 = normalizeUsPhone(parsed.data.phone);
  if (!phoneE164) {
    res.status(400).json({ error: "Enter a valid US mobile number." });
    return;
  }

  const endpoint = process.env.AIMD_SMS_SUBSCRIBE_URL?.trim();
  const token = process.env.AIMD_SMS_SUBSCRIBE_TOKEN?.trim();
  const statusWebhookUrl = providerCallbackUrl();
  if (!endpoint || !token || !statusWebhookUrl) {
    req.log.error(
      {
        hasSubscribeUrl: Boolean(endpoint),
        hasSubscribeToken: Boolean(token),
        hasValidStatusWebhookUrl: Boolean(statusWebhookUrl),
      },
      "AIMD SMS provider is not configured",
    );
    res.status(503).json({ error: "Text signup is temporarily unavailable. Please try again later." });
    return;
  }

  const [existing] = await db
    .select()
    .from(smsSubscriptionsTable)
    .where(eq(smsSubscriptionsTable.phoneE164, phoneE164))
    .limit(1);
  if (existing?.consentStatus === "confirmed") {
    res.status(409).json({ error: "This mobile number is already on the AIMD Text List." });
    return;
  }

  const key = requestKey(req.ip, phoneE164);
  const attempt = await claimConfirmationAttempt(
    key,
    requesterKey(req),
    phoneE164,
  );
  if (attempt === "phone_cooldown") {
    res.status(429).json({ error: "Please wait before requesting another confirmation text." });
    return;
  }
  if (attempt === "requester_limit") {
    res.status(429).json({
      error: "Too many different numbers were submitted from this connection. Please try again later.",
    });
    return;
  }

  const consentRequestedAt = new Date();
  const values = {
    firstName: parsed.data.firstName.trim(),
    phoneE164,
    consentStatus: "pending",
    consentSource: parsed.data.consentSource,
    source: parsed.data.source?.trim() || null,
    pageUrl: parsed.data.pageUrl,
    consentDisclosureVersion: parsed.data.consentDisclosureVersion,
    consentRequestedAt,
    confirmationError: null,
    updatedAt: consentRequestedAt,
  };

  const [subscription] = await db
    .insert(smsSubscriptionsTable)
    .values(values)
    .onConflictDoUpdate({
      target: smsSubscriptionsTable.phoneE164,
      set: values,
    })
    .returning();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        firstName: subscription.firstName,
        phone: subscription.phoneE164,
        consentStatus: "pending",
        consentSource: subscription.consentSource,
        consentRequestedAt: subscription.consentRequestedAt.toISOString(),
        pageUrl: subscription.pageUrl,
        source: subscription.source,
        campaign: subscription.source,
        consentDisclosureVersion: subscription.consentDisclosureVersion,
        confirmationText: CONFIRMATION_TEXT,
        statusWebhookUrl,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`HQ adapter returned HTTP ${response.status}`);
    }

    await db
      .update(smsSubscriptionsTable)
      .set({ confirmationRequestedAt: new Date(), confirmationError: null })
      .where(eq(smsSubscriptionsTable.id, subscription.id));

    res.status(202).json(
      CreateSmsSubscriptionResponse.parse({
        status: "pending",
        message: "We sent a confirmation message. Reply YES to finish joining.",
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMS adapter error";
    await db
      .update(smsSubscriptionsTable)
      .set({ confirmationError: message })
      .where(eq(smsSubscriptionsTable.id, subscription.id));
    req.log.error({ err: error }, "SMS confirmation request failed");
    res.status(503).json({ error: "We could not send the confirmation text. Please try again later." });
  }
});

router.post("/webhooks/aimd-sms", handleProviderWebhook);
router.post("/sms/subscriptions/webhook", handleProviderWebhook);

export default router;
import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, smsSubscriptionsTable } from "@workspace/db";
import {
  CreateSmsSubscriptionBody,
  CreateSmsSubscriptionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const recentRequests = new Map<string, number>();
const CONFIRMATION_TEXT =
  "Art Is My Drug: Reply YES to confirm you want promotional texts from AIMD. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out.";

function normalizeUsPhone(value: string): string | null {
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
  if (!endpoint) {
    req.log.error("AIMD_SMS_SUBSCRIBE_URL is not configured");
    res.status(503).json({ error: "Text signup is temporarily unavailable. Please try again later." });
    return;
  }

  const key = requestKey(req.ip, phoneE164);
  const lastRequestAt = recentRequests.get(key) || 0;
  if (Date.now() - lastRequestAt < 60_000) {
    res.status(429).json({ error: "Please wait before requesting another confirmation text." });
    return;
  }
  recentRequests.set(key, Date.now());

  const [existing] = await db
    .select()
    .from(smsSubscriptionsTable)
    .where(eq(smsSubscriptionsTable.phoneE164, phoneE164))
    .limit(1);

  if (existing?.consentStatus === "confirmed") {
    res.status(409).json({ error: "This mobile number is already on the AIMD Text List." });
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
        ...(process.env.AIMD_SMS_SUBSCRIBE_TOKEN
          ? { authorization: `Bearer ${process.env.AIMD_SMS_SUBSCRIBE_TOKEN}` }
          : {}),
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
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HQ adapter returned HTTP ${response.status}`);

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

export default router;
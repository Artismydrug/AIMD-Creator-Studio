import express, { type Express } from "express";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { pool } from "@workspace/db";
import { ensureSmsSubscriptionTable } from "../lib/ensureSmsSubscriptionTable";
import smsSubscriptionsRouter from "./sms-subscriptions";

const phones = {
  normalized: [
    "+12025550101",
    "+12025550106",
    "+12025550107",
    "+12025550108",
  ],
  consent: "+12025550102",
  confirmed: "+12025550103",
  pending: "+12025550104",
  adapterFailure: "+12025550105",
  adapterMissing: "+12025550109",
};

const testPhones = [
  ...phones.normalized,
  phones.consent,
  phones.confirmed,
  phones.pending,
  phones.adapterFailure,
  phones.adapterMissing,
];
const originalEndpoint = process.env.AIMD_SMS_SUBSCRIBE_URL;
const originalToken = process.env.AIMD_SMS_SUBSCRIBE_TOKEN;
const originalWebhookSecret = process.env.AIMD_SMS_WEBHOOK_SECRET;
const originalStatusWebhookUrl = process.env.AIMD_SMS_STATUS_WEBHOOK_URL;
const requesterCookieA = `aimd_requester_id=${"a".repeat(64)}`;
const requesterCookieB = `aimd_requester_id=${"b".repeat(64)}`;

function app(): Express {
  const instance = express();
  instance.use(express.json());
  instance.use((req, _res, next) => {
    (req as any).log = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
    next();
  });
  instance.use("/api", smsSubscriptionsRouter);
  return instance;
}

function validBody(phone: string) {
  return {
    firstName: "  Ada  ",
    phone,
    consentAccepted: true,
    pageUrl: "https://artismydrug.com/text-list",
    source: "  launch-footer  ",
    consentSource: "AIMD website text-club form",
    consentDisclosureVersion: "launch-2026-09",
  };
}

async function deleteFixtures(): Promise<void> {
  await pool.query(
    "DELETE FROM sms_confirmation_attempts WHERE phone_e164 = ANY($1::text[])",
    [testPhones],
  );
  await pool.query(
    "DELETE FROM sms_subscriptions WHERE phone_e164 = ANY($1::text[])",
    [testPhones],
  );
}

beforeAll(async () => {
  await ensureSmsSubscriptionTable();
  await deleteFixtures();
});

beforeEach(async () => {
  process.env.AIMD_SMS_SUBSCRIBE_URL =
    "https://sms-adapter.example.test/api/sms/subscribe";
  process.env.AIMD_SMS_SUBSCRIBE_TOKEN = "test-adapter-token";
  process.env.AIMD_SMS_STATUS_WEBHOOK_URL =
    "https://artismydrug.com/api/webhooks/aimd-sms";
  delete process.env.AIMD_SMS_WEBHOOK_SECRET;
  await deleteFixtures();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 201 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await deleteFixtures();
  if (originalEndpoint === undefined) {
    delete process.env.AIMD_SMS_SUBSCRIBE_URL;
  } else {
    process.env.AIMD_SMS_SUBSCRIBE_URL = originalEndpoint;
  }
  if (originalToken === undefined) {
    delete process.env.AIMD_SMS_SUBSCRIBE_TOKEN;
  } else {
    process.env.AIMD_SMS_SUBSCRIBE_TOKEN = originalToken;
  }
  if (originalWebhookSecret === undefined) {
    delete process.env.AIMD_SMS_WEBHOOK_SECRET;
  } else {
    process.env.AIMD_SMS_WEBHOOK_SECRET = originalWebhookSecret;
  }
  if (originalStatusWebhookUrl === undefined) {
    delete process.env.AIMD_SMS_STATUS_WEBHOOK_URL;
  } else {
    process.env.AIMD_SMS_STATUS_WEBHOOK_URL = originalStatusWebhookUrl;
  }
});

describe("SMS subscription consent guardrails", () => {
  it.each([
    ["202-555-0101", "+12025550101"],
    ["(202) 555-0106", "+12025550106"],
    ["1 (202) 555-0107", "+12025550107"],
    ["+1 202 555 0108", "+12025550108"],
  ])("normalizes the valid US number %s to E.164", async (phone, expected) => {
    await pool.query(
      "DELETE FROM sms_subscriptions WHERE phone_e164 = $1",
      [expected],
    );

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody(phone));

    expect(response.status).toBe(202);
    const { rows } = await pool.query<{
      phone_e164: string;
      consent_status: string;
    }>(
      `SELECT phone_e164, consent_status
         FROM sms_subscriptions
        WHERE phone_e164 = $1`,
      [expected],
    );
    expect(rows).toEqual([
      { phone_e164: expected, consent_status: "pending" },
    ]);
  });

  it.each([
    "202-555-010",
    "20255501011",
    "120255501011",
    "0125550101",
    "2021550101",
    "not-a-number",
  ])("rejects the invalid US number %s", async (phone) => {
    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody(phone));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid US mobile number/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unchecked consent before storing or contacting the adapter", async () => {
    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send({ ...validBody("(202) 555-0102"), consentAccepted: false });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/consent.*required/i);
    expect(fetch).not.toHaveBeenCalled();
    const { rows } = await pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM sms_subscriptions WHERE phone_e164 = $1",
      [phones.consent],
    );
    expect(rows[0].count).toBe(0);
  });

  it("blocks a number whose consent is already confirmed", async () => {
    await pool.query(
      `INSERT INTO sms_subscriptions
        (first_name, phone_e164, consent_status, consent_source, page_url,
         consent_disclosure_version)
       VALUES ($1, $2, 'confirmed', $3, $4, $5)`,
      [
        "Ada",
        phones.confirmed,
        "AIMD website text-club form",
        "https://artismydrug.com/text-list",
        "launch-2026-09",
      ],
    );

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("(202) 555-0103"));

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already.*Text List/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps consent pending, preserves metadata, and rate-limits a repeated pending attempt", async () => {
    const first = await request(app())
      .post("/api/sms/subscriptions")
      .send({
        ...validBody("(202) 555-0104"),
        requesterKey: "browser-controlled-value-must-be-ignored",
      });

    expect(first.status).toBe(202);
    expect(first.body.status).toBe("pending");
    expect(fetch).toHaveBeenCalledOnce();

    const [endpoint, options] = vi.mocked(fetch).mock.calls[0];
    expect(endpoint).toBe(process.env.AIMD_SMS_SUBSCRIBE_URL);
    const headers = new Headers(options?.headers);
    const requesterKey = headers.get("x-aimd-requester-key");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer test-adapter-token");
    expect(requesterKey).toMatch(/^[0-9a-f]{64}$/);
    expect(requesterKey).not.toBe("browser-controlled-value-must-be-ignored");
    const adapterBody = JSON.parse(String(options?.body));
    expect(adapterBody).toMatchObject({
      firstName: "Ada",
      phone: phones.pending,
      consentAccepted: true,
      consentStatus: "pending",
      source: "AIMD website text-club form",
      pageUrl: "https://artismydrug.com",
      disclosureVersion: "launch-2026-09",
    });
    expect(adapterBody.requesterKey).toBe(requesterKey);
    expect(Object.keys(adapterBody).sort()).toEqual([
      "consentAccepted",
      "consentStatus",
      "disclosureVersion",
      "firstName",
      "pageUrl",
      "phone",
      "requesterKey",
      "source",
    ]);
    expect(adapterBody).not.toHaveProperty("token");
    expect(adapterBody).not.toHaveProperty("confirmationText");
    expect(adapterBody).not.toHaveProperty("statusWebhookUrl");

    const { rows } = await pool.query<{
      consent_status: string;
      consent_source: string;
      source: string;
      page_url: string;
      consent_disclosure_version: string;
      confirmation_requested_at: Date | null;
    }>(
      `SELECT consent_status, consent_source, source, page_url,
              consent_disclosure_version, confirmation_requested_at
         FROM sms_subscriptions
        WHERE phone_e164 = $1`,
      [phones.pending],
    );
    expect(rows[0]).toMatchObject({
      consent_status: "pending",
      consent_source: "AIMD website text-club form",
      source: "launch-footer",
      page_url: "https://artismydrug.com/text-list",
      consent_disclosure_version: "launch-2026-09",
      confirmation_requested_at: expect.any(Date),
    });

    const repeated = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", `aimd_requester_id=${requesterKey}`)
      .send(validBody("+1 202 555 0104"));

    expect(repeated.status).toBe(429);
    expect(repeated.body.error).toMatch(/wait.*another confirmation text/i);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("creates a secure HttpOnly requester cookie without exposing server credentials to browser JavaScript", async () => {
    const phone = "+12025550160";
    testPhones.push(phone);

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody(phone));

    expect(response.status).toBe(202);
    const setCookie = response.headers["set-cookie"]?.[0];
    expect(setCookie).toMatch(/^aimd_requester_id=[0-9a-f]{64};/);
    expect(setCookie).toContain("Max-Age=86400");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");

    const forwardedHeaders = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    const requesterKey = forwardedHeaders.get("x-aimd-requester-key");
    expect(requesterKey).toMatch(/^[0-9a-f]{64}$/);
    expect(setCookie).toContain(`aimd_requester_id=${requesterKey}`);
    const adapterBody = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(adapterBody).toMatchObject({ requesterKey });
    expect(adapterBody.requesterKey).toMatch(/^[0-9a-f]{64}$/);
    expect(adapterBody).not.toHaveProperty("token");
    expect(adapterBody).not.toHaveProperty("phone");
    expect(response.body).not.toHaveProperty("requesterKey");
    expect(response.body).not.toHaveProperty("token");
    expect(response.headers).not.toHaveProperty("authorization");
    expect(response.headers).not.toHaveProperty("x-aimd-requester-key");
    expect(response.text).not.toContain(String(requesterKey));
    expect(response.text).not.toContain("test-adapter-token");
  });

  it("validates the requester key before sending it to HQ", async () => {
    const phone = "+12025550163";
    testPhones.push(phone);

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieA)
      .send(validBody(phone));

    expect(response.status).toBe(202);
    const headers = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    expect(headers.get("x-aimd-requester-key")).toBe("a".repeat(64));
    expect(headers.get("x-aimd-requester-key")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses the same requester key for two requests from the same browser cookie", async () => {
    const phone = "+12025550161";
    testPhones.push(phone);

    const first = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody(phone));
    const setCookie = first.headers["set-cookie"]?.[0];
    const cookiePair = setCookie?.split(";")[0];
    expect(cookiePair).toMatch(/^aimd_requester_id=[0-9a-f]{64}$/);

    await pool.query(
      `UPDATE sms_confirmation_attempts
          SET last_attempt_at = NOW() - INTERVAL '61 seconds'
        WHERE phone_e164 = $1`,
      [phone],
    );

    const second = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", cookiePair!)
      .send(validBody(phone));

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(fetch).toHaveBeenCalledTimes(2);
    const firstHeaders = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    const secondHeaders = new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers);
    expect(firstHeaders.get("x-aimd-requester-key")).toMatch(/^[0-9a-f]{64}$/);
    expect(secondHeaders.get("x-aimd-requester-key")).toBe(
      firstHeaders.get("x-aimd-requester-key"),
    );
    expect(second.headers["set-cookie"]).toBeUndefined();
  });

  it("uses different requester keys for requests with different browser cookies", async () => {
    const phone = "+12025550162";
    testPhones.push(phone);

    const first = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieA)
      .send(validBody(phone));
    const second = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieB)
      .send(validBody(phone));

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(fetch).toHaveBeenCalledTimes(2);
    const firstHeaders = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    const secondHeaders = new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers);
    expect(firstHeaders.get("x-aimd-requester-key")).toBe("a".repeat(64));
    expect(secondHeaders.get("x-aimd-requester-key")).toBe("b".repeat(64));
    expect(firstHeaders.get("x-aimd-requester-key")).not.toBe(
      secondHeaders.get("x-aimd-requester-key"),
    );
  });

  it("shares the pending cooldown across separate app instances", async () => {
    const firstServer = app();
    const secondServer = app();
    const phone = "+12025550110";
    testPhones.push(phone);

    const first = await request(firstServer)
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieA)
      .send(validBody("(202) 555-0110"));
    const repeated = await request(secondServer)
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieA)
      .send(validBody("(202) 555-0110"));

    expect(first.status).toBe(202);
    expect(repeated.status).toBe(429);
    expect(fetch).toHaveBeenCalledOnce();

    const { rows } = await pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM sms_confirmation_attempts WHERE phone_e164 = $1",
      [phone],
    );
    expect(rows[0].count).toBe(1);
  });

  it("allows another confirmation attempt after the shared cooldown expires", async () => {
    const phone = "+12025550111";
    testPhones.push(phone);

    const first = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieA)
      .send(validBody("(202) 555-0111"));
    expect(first.status).toBe(202);

    await pool.query(
      `UPDATE sms_confirmation_attempts
          SET last_attempt_at = NOW() - INTERVAL '61 seconds'
        WHERE phone_e164 = $1`,
      [phone],
    );

    const afterExpiry = await request(app())
      .post("/api/sms/subscriptions")
      .set("Cookie", requesterCookieA)
      .send(validBody("(202) 555-0111"));

    expect(afterExpiry.status).toBe(202);
    expect(fetch).toHaveBeenCalledTimes(2);
    const firstHeaders = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    const secondHeaders = new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers);
    expect(secondHeaders.get("x-aimd-requester-key")).toBe(
      firstHeaders.get("x-aimd-requester-key"),
    );
  });

  it("blocks one requester from submitting a different phone number", async () => {
    const instance = app();
    const phonesForRequester = [
      "+12025550112",
      "+12025550113",
      "+12025550114",
      "+12025550115",
    ];
    testPhones.push(...phonesForRequester);

    const responses = [];
    for (const phone of phonesForRequester) {
      responses.push(
        await request(instance)
          .post("/api/sms/subscriptions")
          .set("Cookie", requesterCookieA)
          .send(validBody(phone)),
      );
    }

    expect(responses[0].status).toBe(202);
    expect(responses.slice(1).map((response) => response.status)).toEqual([
      429,
      429,
      429,
    ]);
    expect(responses[1].body.error).toMatch(/different numbers/i);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("returns an error rather than success when the adapter is unavailable", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 503 }),
    );

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("(202) 555-0105"));

    expect(response.status).toBe(503);
    expect(response.body.error).toMatch(/could not send/i);
    expect(response.body.status).toBeUndefined();

    const { rows } = await pool.query<{
      consent_status: string;
      confirmation_requested_at: Date | null;
      confirmation_error: string | null;
    }>(
      `SELECT consent_status, confirmation_requested_at, confirmation_error
         FROM sms_subscriptions
        WHERE phone_e164 = $1`,
      [phones.adapterFailure],
    );
    expect(rows[0].consent_status).toBe("pending");
    expect(rows[0].confirmation_requested_at).toBeNull();
    expect(rows[0].confirmation_error).toContain("HTTP 503");
  });

  it("passes an HQ rate limit to the form without retrying", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 429 }),
    );

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("(202) 555-0105"));

    expect(response.status).toBe(429);
    expect(response.body.error).toMatch(/too many.*wait/i);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("returns an error rather than success when the adapter is not configured", async () => {
    delete process.env.AIMD_SMS_SUBSCRIBE_URL;

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("(202) 555-0109"));

    expect(response.status).toBe(503);
    expect(response.body.error).toMatch(/temporarily unavailable/i);
    expect(response.body.status).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();

    const { rows } = await pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM sms_subscriptions WHERE phone_e164 = $1",
      [phones.adapterMissing],
    );
    expect(rows[0].count).toBe(0);
  });

  it("requires the provider token before storing or contacting the adapter", async () => {
    delete process.env.AIMD_SMS_SUBSCRIBE_TOKEN;

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("+1 (202) 555-0101"));

    expect(response.status).toBe(503);
    expect(response.body.error).toMatch(/temporarily unavailable/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires the dedicated canonical HTTPS subscription endpoint", async () => {
    process.env.AIMD_SMS_SUBSCRIBE_URL =
      "https://sms-adapter.example.test/api/sms/webhook";

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .set("host", "attacker.example")
      .send(validBody("+1 (202) 555-0101"));

    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
    const { rows } = await pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM sms_subscriptions WHERE phone_e164 = $1",
      [phones.normalized[0]],
    );
    expect(rows[0].count).toBe(0);
  });

  it("accepts only an HQ 201 response as confirmation-text success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );

    const response = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("+1 (202) 555-0101"));

    expect(response.status).toBe(503);
    expect(response.body.error).toMatch(/could not send/i);
  });

  it("shows HQ's opted-out guidance and releases the rejected attempt", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));

    const first = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("+1 (202) 555-0101"));
    const retry = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("+1 (202) 555-0101"));

    expect(first.status).toBe(409);
    expect(first.body.error).toMatch(/text START/i);
    expect(retry.status).toBe(202);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("passes through a safe HQ validation message and releases the rejected attempt", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Phone is not eligible for SMS." }), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }));

    const first = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("+1 (202) 555-0101"));
    const retry = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("+1 (202) 555-0101"));

    expect(first.status).toBe(422);
    expect(first.body.error).toBe("Phone is not eligible for SMS.");
    expect(retry.status).toBe(202);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["YES", "confirmed"],
    ["STOP", "opted_out"],
  ])("synchronizes provider %s events to the local consent status", async (reply, expectedStatus) => {
    await pool.query(
      `INSERT INTO sms_subscriptions
        (first_name, phone_e164, consent_status, consent_source, page_url,
         consent_disclosure_version)
       VALUES ($1, $2, 'pending', $3, $4, $5)`,
      [
        "Ada",
        phones.adapterFailure,
        "AIMD website text-club form",
        "https://artismydrug.com/text-list",
        "launch-2026-09",
      ],
    );

    const response = await request(app())
      .post("/api/webhooks/aimd-sms")
      .set("authorization", "Bearer test-adapter-token")
      .send({
        eventId: `event-${reply.toLowerCase()}`,
        occurredAt: new Date().toISOString(),
        from: phones.adapterFailure,
        message: reply,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ received: true, matched: true });
    const { rows } = await pool.query<{
      consent_status: string;
      confirmed_at: Date | null;
      opted_out_at: Date | null;
    }>(
      `SELECT consent_status, confirmed_at, opted_out_at
         FROM sms_subscriptions
        WHERE phone_e164 = $1`,
      [phones.adapterFailure],
    );
    expect(rows[0].consent_status).toBe(expectedStatus);
    if (expectedStatus === "confirmed") {
      expect(rows[0].confirmed_at).toEqual(expect.any(Date));
    } else {
      expect(rows[0].opted_out_at).toEqual(expect.any(Date));
    }
  });

  it("records HELP without changing the current consent status", async () => {
    await pool.query(
      `INSERT INTO sms_subscriptions
        (first_name, phone_e164, consent_status, consent_source, page_url,
         consent_disclosure_version)
       VALUES ($1, $2, 'confirmed', $3, $4, $5)`,
      [
        "Ada",
        phones.adapterFailure,
        "AIMD website text-club form",
        "https://artismydrug.com/text-list",
        "launch-2026-09",
      ],
    );

    const response = await request(app())
      .post("/api/sms/subscriptions/webhook")
      .set("x-aimd-sms-secret", "test-adapter-token")
      .send({
        eventId: "event-help",
        occurredAt: new Date().toISOString(),
        phoneE164: phones.adapterFailure,
        keyword: "HELP",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      received: true,
      matched: true,
      action: "help",
      consentStatus: "confirmed",
    });
    const { rows } = await pool.query<{
      consent_status: string;
      help_requested_at: Date | null;
    }>(
      `SELECT consent_status, help_requested_at
         FROM sms_subscriptions
        WHERE phone_e164 = $1`,
      [phones.adapterFailure],
    );
    expect(rows[0]).toMatchObject({
      consent_status: "confirmed",
      help_requested_at: expect.any(Date),
    });
  });

  it("rejects provider events with an invalid secret", async () => {
    const response = await request(app())
      .post("/api/webhooks/aimd-sms")
      .set("authorization", "Bearer wrong-token")
      .send({
        eventId: "event-invalid-secret",
        occurredAt: new Date().toISOString(),
        phone: phones.pending,
        message: "STOP",
      });

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never lets a delayed or duplicate YES reverse a STOP", async () => {
    await pool.query(
      `INSERT INTO sms_subscriptions
        (first_name, phone_e164, consent_status, consent_source, page_url,
         consent_disclosure_version)
       VALUES ($1, $2, 'pending', $3, $4, $5)`,
      [
        "Ada",
        phones.adapterFailure,
        "AIMD website text-club form",
        "https://artismydrug.com/text-list",
        "launch-2026-09",
      ],
    );
    const stopAt = new Date(Date.now() + 1_000);
    const stop = await request(app())
      .post("/api/webhooks/aimd-sms")
      .set("authorization", "Bearer test-adapter-token")
      .send({
        eventId: "event-stop-first",
        occurredAt: stopAt.toISOString(),
        phone: phones.adapterFailure,
        message: "STOP",
      });
    expect(stop.status).toBe(200);

    const delayedYes = await request(app())
      .post("/api/webhooks/aimd-sms")
      .set("authorization", "Bearer test-adapter-token")
      .send({
        eventId: "event-old-yes",
        occurredAt: new Date(stopAt.getTime() - 500).toISOString(),
        phone: phones.adapterFailure,
        message: "YES",
      });
    expect(delayedYes.body).toMatchObject({
      ignored: true,
      reason: "not_pending_or_stale",
      consentStatus: "opted_out",
    });

    const laterYes = await request(app())
      .post("/api/webhooks/aimd-sms")
      .set("authorization", "Bearer test-adapter-token")
      .send({
        eventId: "event-later-yes",
        occurredAt: new Date(stopAt.getTime() + 500).toISOString(),
        phone: phones.adapterFailure,
        message: "YES",
      });
    expect(laterYes.body).toMatchObject({
      ignored: true,
      reason: "not_pending_or_stale",
      consentStatus: "opted_out",
    });

    const duplicateStop = await request(app())
      .post("/api/webhooks/aimd-sms")
      .set("authorization", "Bearer test-adapter-token")
      .send({
        eventId: "event-stop-first",
        occurredAt: stopAt.toISOString(),
        phone: phones.adapterFailure,
        message: "STOP",
      });
    expect(duplicateStop.body).toMatchObject({ consentStatus: "opted_out" });
  });

  it("keeps STOP authoritative when YES and STOP arrive concurrently", async () => {
    await pool.query(
      `INSERT INTO sms_subscriptions
        (first_name, phone_e164, consent_status, consent_source, page_url,
         consent_disclosure_version)
       VALUES ($1, $2, 'pending', $3, $4, $5)`,
      [
        "Ada",
        phones.adapterFailure,
        "AIMD website text-club form",
        "https://artismydrug.com/text-list",
        "launch-2026-09",
      ],
    );
    const occurredAt = new Date(Date.now() + 1_000).toISOString();
    const providerEvent = (message: "YES" | "STOP") =>
      request(app())
        .post("/api/webhooks/aimd-sms")
        .set("authorization", "Bearer test-adapter-token")
        .send({
          eventId: `event-concurrent-${message.toLowerCase()}`,
          occurredAt,
          phone: phones.adapterFailure,
          message,
        });

    const responses = await Promise.all([
      providerEvent("YES"),
      providerEvent("STOP"),
    ]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const { rows } = await pool.query<{ consent_status: string }>(
      "SELECT consent_status FROM sms_subscriptions WHERE phone_e164 = $1",
      [phones.adapterFailure],
    );
    expect(rows[0].consent_status).toBe("opted_out");
  });
});
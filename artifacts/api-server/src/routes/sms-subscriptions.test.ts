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
    "DELETE FROM sms_subscriptions WHERE phone_e164 = ANY($1::text[])",
    [testPhones],
  );
}

beforeAll(deleteFixtures);

beforeEach(() => {
  process.env.AIMD_SMS_SUBSCRIBE_URL = "https://sms-adapter.example.test/subscribe";
  delete process.env.AIMD_SMS_SUBSCRIBE_TOKEN;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
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
    process.env.AIMD_SMS_SUBSCRIBE_TOKEN = "test-adapter-token";

    const first = await request(app())
      .post("/api/sms/subscriptions")
      .send(validBody("(202) 555-0104"));

    expect(first.status).toBe(202);
    expect(first.body.status).toBe("pending");
    expect(fetch).toHaveBeenCalledOnce();

    const [endpoint, options] = vi.mocked(fetch).mock.calls[0];
    expect(endpoint).toBe(process.env.AIMD_SMS_SUBSCRIBE_URL);
    expect(options?.headers).toMatchObject({
      "content-type": "application/json",
      authorization: "Bearer test-adapter-token",
    });
    expect(JSON.parse(String(options?.body))).toMatchObject({
      firstName: "Ada",
      phone: phones.pending,
      consentStatus: "pending",
      consentSource: "AIMD website text-club form",
      pageUrl: "https://artismydrug.com/text-list",
      source: "launch-footer",
      campaign: "launch-footer",
      consentDisclosureVersion: "launch-2026-09",
      confirmationText: expect.stringContaining("Reply YES"),
    });

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
      .send(validBody("+1 202 555 0104"));

    expect(repeated.status).toBe(429);
    expect(repeated.body.error).toMatch(/wait.*another confirmation text/i);
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
});
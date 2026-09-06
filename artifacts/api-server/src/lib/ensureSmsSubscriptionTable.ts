import { pool } from "@workspace/db";

export async function ensureSmsSubscriptionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_subscriptions (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      phone_e164 TEXT NOT NULL,
      consent_status TEXT NOT NULL DEFAULT 'pending',
      consent_source TEXT NOT NULL,
      source TEXT,
      page_url TEXT NOT NULL,
      consent_disclosure_version TEXT NOT NULL,
      consent_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmation_requested_at TIMESTAMPTZ,
      confirmation_error TEXT,
      confirmed_at TIMESTAMPTZ,
      opted_out_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS sms_subscriptions_phone_unique
      ON sms_subscriptions(phone_e164);
    CREATE INDEX IF NOT EXISTS sms_subscriptions_status_requested_idx
      ON sms_subscriptions(consent_status, consent_requested_at);
  `);
}
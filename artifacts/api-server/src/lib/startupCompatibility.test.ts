import { pool } from "@workspace/db";
import { afterAll, describe, expect, it } from "vitest";
import { ensureChallengeTables } from "./ensureChallengeTables";
import { ensureUserTierCompatibility } from "./ensureUserTierCompatibility";

describe("startup compatibility migrations", () => {
  const schemaName = `startup_compat_${process.pid}`;

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  });

  it("upgrades the legacy challenge schema and Tier 2 name", async () => {
    const client = await pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          tier TEXT NOT NULL DEFAULT 'free'
        );
        CREATE TABLE badges (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id)
        );
        CREATE TABLE challenge_submissions (
          id SERIAL PRIMARY KEY,
          challenge_week TEXT NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          caption TEXT NOT NULL,
          image_url TEXT,
          tags TEXT[] NOT NULL DEFAULT '{}',
          vote_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT legacy_submission_week UNIQUE (challenge_week, user_id)
        );
        CREATE TABLE challenge_votes (
          id SERIAL PRIMARY KEY,
          submission_id INTEGER NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT legacy_vote UNIQUE (submission_id, user_id)
        );
        INSERT INTO users (tier) VALUES ('workshop');
      `);

      await ensureChallengeTables(client);
      await ensureUserTierCompatibility(client);

      const columns = await client.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = '${schemaName}'
          AND table_name = 'challenge_submissions'
      `);
      const tier = await client.query<{ tier: string }>(
        `SELECT tier FROM users LIMIT 1`,
      );
      const mediaTable = await client.query<{ exists: boolean }>(`
        SELECT to_regclass('${schemaName}.challenge_media_uploads') IS NOT NULL AS exists
      `);

      expect(columns.rows.map((row) => row.column_name)).toEqual(
        expect.arrayContaining([
          "final_media_upload_id",
          "process_media_upload_id",
          "verification_status",
          "verification_reviewed_at",
          "verification_reviewer_id",
        ]),
      );
      expect(mediaTable.rows[0]?.exists).toBe(true);
      expect(tier.rows[0]?.tier).toBe("academy");
    } finally {
      await client.query(`RESET search_path`);
      client.release();
    }
  });
});
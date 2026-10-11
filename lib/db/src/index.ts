import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Per API process: keep the existing ten-connection ceiling, but bound waits
// and SQL execution instead of leaving an unlimited queue during an outage.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  statement_timeout: 15_000,
  query_timeout: 17_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";

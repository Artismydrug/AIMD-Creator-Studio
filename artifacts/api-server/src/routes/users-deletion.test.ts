import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import { clerkAuth } from "../middlewares/clerkAuth";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: mocks.getAuth,
  createClerkClient: () => ({ users: { deleteUser: mocks.deleteUser } }),
}));

import usersRouter from "./users";

type TestUser = {
  id: number;
  clerkId: string;
  email: string;
  username: string;
};

const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const clerkUserId = `user_account_delete_${suffix}`;
let user: TestUser;

function appFor(): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = user;
    next();
  });
  app.use("/api", usersRouter);
  return app;
}

beforeAll(async () => {
  process.env.CLERK_SECRET_KEY = "test-clerk-secret";
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_clerk_users (
        clerk_id TEXT PRIMARY KEY,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (error: any) {
    // Two Vitest files can initialize the idempotent table concurrently. One
    // PostgreSQL backend may briefly report the internal type as duplicated;
    // the winning CREATE has already made the table available.
    if (!["42P07", "23505"].includes(error?.code)) throw error;
  }
  await pool.query("DELETE FROM users WHERE clerk_id = $1", [clerkUserId]);
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, clerk_id)
     VALUES ($1, $2, $3)
     RETURNING id, email, username, clerk_id AS "clerkId"`,
    [
      `account_delete_${suffix}@example.test`,
      `account_delete_${suffix}`,
      clerkUserId,
    ],
  );
  user = rows[0]!;
  mocks.getAuth.mockReturnValue({ userId: clerkUserId });
  mocks.deleteUser.mockResolvedValue({});
});

afterAll(async () => {
  await pool.query("DELETE FROM deleted_clerk_users WHERE clerk_id = $1", [clerkUserId]);
  await pool.query("DELETE FROM users WHERE id = $1", [user?.id]);
  delete process.env.CLERK_SECRET_KEY;
});

describe("DELETE /api/users/me", () => {
  it("deletes the Clerk identity first, removes local data, and leaves a tombstone", async () => {
    const res = await request(appFor()).delete("/api/users/me");

    expect(res.status).toBe(204);
    expect(mocks.deleteUser).toHaveBeenCalledWith(clerkUserId);
    const local = await pool.query("SELECT id FROM users WHERE id = $1", [user.id]);
    expect(local.rows).toHaveLength(0);
    const tombstone = await pool.query(
      "SELECT clerk_id FROM deleted_clerk_users WHERE clerk_id = $1",
      [clerkUserId],
    );
    expect(tombstone.rows).toHaveLength(1);
  });

  it("does not recreate a local user for a stale token after deletion", async () => {
    const req = { dbUser: undefined } as any;
    mocks.getAuth.mockReturnValue({ userId: clerkUserId });
    await new Promise<void>((resolve, reject) => {
      void clerkAuth(req, {} as any, (error?: unknown) => {
        if (error) reject(error);
        else resolve();
      });
    });

    expect(req.dbUser).toBeUndefined();
    const local = await pool.query("SELECT id FROM users WHERE clerk_id = $1", [clerkUserId]);
    expect(local.rows).toHaveLength(0);
  });

  it("requires a matching authenticated Clerk identity", async () => {
    mocks.getAuth.mockReturnValue({ userId: "user_someone_else" });
    const res = await request(appFor()).delete("/api/users/me");
    expect(res.status).toBe(401);
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
  });
});
import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import { clerkAuth } from "../middlewares/clerkAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { deleteLocalAccount } from "../lib/accountDeletion";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: mocks.getAuth,
  createClerkClient: () => ({ users: { deleteUser: mocks.deleteUser } }),
}));

import usersRouter from "./users";

const deleteObjectEntityIfOwned = vi.spyOn(
  ObjectStorageService.prototype,
  "deleteObjectEntityIfOwned",
);

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
  deleteObjectEntityIfOwned.mockResolvedValue("deleted");
});

afterAll(async () => {
  await pool.query("DELETE FROM deleted_clerk_users WHERE clerk_id = $1", [clerkUserId]);
  await pool.query("DELETE FROM users WHERE id = $1", [user?.id]);
  delete process.env.CLERK_SECRET_KEY;
});

describe("DELETE /api/users/me", () => {
  it("deletes the Clerk identity first, removes local data, and leaves a tombstone", async () => {
    const avatarPath = `/api/storage/objects/account-delete-avatar-${suffix}`;
    const postPath = `/objects/account-delete-post-${suffix}`;
    const sharedUsername = `account_delete_shared_${suffix}`;
    const sharedEmail = `${sharedUsername}@example.test`;

    await pool.query(
      "UPDATE users SET avatar_url = $1 WHERE id = $2",
      [avatarPath, user.id],
    );
    await pool.query(
      `INSERT INTO studio_posts (user_id, image_url, caption)
       VALUES ($1, $2, $3)`,
      [user.id, postPath, "Deletion cleanup test"],
    );
    const { rows: sharedRows } = await pool.query<{ id: number }>(
      `INSERT INTO users (email, username, clerk_id, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [sharedEmail, sharedUsername, `clerk_shared_${suffix}`, postPath],
    );

    const res = await request(appFor()).delete("/api/users/me");

    expect(res.status).toBe(204);
    expect(mocks.deleteUser).toHaveBeenCalledWith(clerkUserId);
    expect(deleteObjectEntityIfOwned).toHaveBeenCalledWith(avatarPath, String(user.id));
    expect(deleteObjectEntityIfOwned).not.toHaveBeenCalledWith(postPath, String(user.id));
    const local = await pool.query("SELECT id FROM users WHERE id = $1", [user.id]);
    expect(local.rows).toHaveLength(0);
    await pool.query("DELETE FROM users WHERE id = $1", [sharedRows[0]!.id]);
    const tombstone = await pool.query(
      "SELECT clerk_id FROM deleted_clerk_users WHERE clerk_id = $1",
      [clerkUserId],
    );
    expect(tombstone.rows).toHaveLength(1);
  });

  it("leaves local data in place when object cleanup fails, then retries idempotently", async () => {
    const retryClerkUserId = `user_account_delete_retry_${suffix}`;
    const retryUsername = `account_delete_retry_${suffix}`;
    const retryPath = `/objects/account-delete-retry-${suffix}`;
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO users (email, username, clerk_id, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        `${retryUsername}@example.test`,
        retryUsername,
        retryClerkUserId,
        retryPath,
      ],
    );
    const retryUserId = rows[0]!.id;

    deleteObjectEntityIfOwned
      .mockReset()
      .mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(
      deleteLocalAccount({
        clerkUserId: retryClerkUserId,
        localUserId: retryUserId,
      }),
    ).rejects.toThrow("storage unavailable");

    const retained = await pool.query("SELECT id FROM users WHERE id = $1", [retryUserId]);
    expect(retained.rows).toHaveLength(1);

    deleteObjectEntityIfOwned.mockResolvedValue("deleted");
    await deleteLocalAccount({
      clerkUserId: retryClerkUserId,
      localUserId: retryUserId,
    });

    const removed = await pool.query("SELECT id FROM users WHERE id = $1", [retryUserId]);
    expect(removed.rows).toHaveLength(0);
    await pool.query("DELETE FROM deleted_clerk_users WHERE clerk_id = $1", [retryClerkUserId]);
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
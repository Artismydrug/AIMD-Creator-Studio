import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import { ensureCreatorStudioSchema } from "../lib/ensureCreatorStudioSchema";

vi.mock("../lib/objectStorage", () => {
  class ObjectNotFoundError extends Error {}
  class ObjectStorageService {
    async getObjectEntityFile(objectPath: string) {
      const ownerId = objectPath.match(/avatar-(\d+)\.png$/)?.[1] ?? null;
      return { ownerId, objectPath };
    }
    async canAccessObjectEntity({ userId, objectFile }: {
      userId: string;
      objectFile: { ownerId: string | null };
    }) {
      return objectFile.ownerId === userId;
    }
  }
  return { ObjectNotFoundError, ObjectStorageService };
});

vi.mock("../lib/objectAcl", () => ({
  ObjectPermission: { WRITE: "write" },
  getObjectAclPolicy: vi.fn(async (objectFile: { ownerId: string | null }) => ({
    owner: objectFile.ownerId,
    visibility: "public",
  })),
}));

import usersRouter from "./users";

type TestUser = { id: number; email: string; username: string };
let creator: TestUser;
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

function appFor(user?: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as any).dbUser = { id: user.id, email: user.email, username: user.username };
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", usersRouter);
  return app;
}

beforeAll(async () => {
  await ensureCreatorStudioSchema();
  const { rows } = await pool.query<TestUser>(
    "INSERT INTO users (email, username) VALUES ($1, $2) RETURNING id, email, username",
    [`profile_settings_${suffix}@example.test`, `profile_settings_${suffix}`],
  );
  creator = rows[0];
});

afterAll(async () => {
  if (creator?.id) await pool.query("DELETE FROM users WHERE id = $1", [creator.id]);
});

describe("creator profile settings persistence", () => {
  it("saves the bio, owned uploaded avatar, links and accent to the public profile", async () => {
    const avatarUrl = `/api/storage/objects/uploads/avatar-${creator.id}.png`;
    const saved = await request(appFor(creator))
      .patch("/api/users/me")
      .send({
        bio: "A profile bio",
        avatarUrl,
        portfolioUrl: "https://portfolio.example/work",
        instagramUrl: "https://www.instagram.com/profile.settings/",
        tiktokUrl: "https://www.tiktok.com/@profilesettings",
        profileAccentColor: "mint",
      });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      bio: "A profile bio",
      avatarUrl,
      portfolioUrl: "https://portfolio.example/work",
      instagramUrl: "https://www.instagram.com/profile.settings/",
      tiktokUrl: "https://www.tiktok.com/@profilesettings",
      profileAccentColor: "mint",
    });

    const profile = await request(appFor()).get(`/api/users/${creator.id}/profile`);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      bio: "A profile bio",
      avatarUrl,
      portfolioUrl: "https://portfolio.example/work",
      instagramUrl: "https://www.instagram.com/profile.settings/",
      tiktokUrl: "https://www.tiktok.com/@profilesettings",
      profileAccentColor: "mint",
    });
  });

  it("rejects an avatar path owned by another member", async () => {
    const result = await request(appFor(creator))
      .patch("/api/users/me")
      .send({ avatarUrl: "/api/storage/objects/uploads/avatar-999999999.png" });
    expect(result.status).toBe(400);
  });
});

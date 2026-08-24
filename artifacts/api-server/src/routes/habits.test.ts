import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import habitsRouter from "./habits";
import { ObjectStorageService } from "../lib/objectStorage";

type TestUser = { id: number; email: string; username: string };

const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
let creator: TestUser;
let otherCreator: TestUser;
let habitId: number;

function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = { id: user.id, email: user.email, username: user.username };
    (req as any).log = { error: () => undefined };
    next();
  });
  app.use("/api", habitsRouter);
  return app;
}

function proofUrl(name: string): string {
  return `/api/storage/objects/uploads/habit-proof-${suffix}-${name}`;
}

beforeAll(async () => {
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin)
     VALUES ($1, $2, false), ($3, $4, false)
     RETURNING id, email, username`,
    [
      `habit_creator_${suffix}@example.test`,
      `habit_creator_${suffix}`,
      `habit_other_${suffix}@example.test`,
      `habit_other_${suffix}`,
    ],
  );
  [creator, otherCreator] = rows;

  const { rows: habits } = await pool.query<{ id: number }>(
    `INSERT INTO habits (user_id, name, category, target_minutes)
     VALUES ($1, 'Proof test habit', 'practice', 10)
     RETURNING id`,
    [creator.id],
  );
  habitId = habits[0].id;
});

afterAll(async () => {
  if (habitId) {
    await pool.query("DELETE FROM habit_logs WHERE habit_id = $1", [habitId]);
    await pool.query("DELETE FROM habits WHERE id = $1", [habitId]);
  }
  if (creator?.id && otherCreator?.id) {
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [creator.id, otherCreator.id]);
  }
  await pool.end().catch(() => {});
});

describe("habit proof trust boundary", () => {
  it("requires proof and rejects unsupported proof media types", async () => {
    const app = appFor(creator);

    const missing = await request(app)
      .post(`/api/habits/${habitId}/log`)
      .send({ minutesSpent: 10 });
    expect(missing.status).toBe(400);

    const unsupported = await request(app)
      .post(`/api/habits/${habitId}/log`)
      .send({
        minutesSpent: 10,
        proofUrl: proofUrl("audio"),
        proofMediaType: "audio",
      });
    expect(unsupported.status).toBe(400);
  });

  it("rejects media belonging to another creator", async () => {
    const objectPath = proofUrl("other-owner");
    const getObject = vi
      .spyOn(ObjectStorageService.prototype, "getObjectEntityFile")
      .mockResolvedValue({} as any);
    const canAccess = vi
      .spyOn(ObjectStorageService.prototype, "canAccessObjectEntity")
      .mockResolvedValue(false);

    const res = await request(appFor(creator))
      .post(`/api/habits/${habitId}/log`)
      .send({ minutesSpent: 10, proofUrl: objectPath, proofMediaType: "image" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/uploaded image or video/i);
    expect(getObject).toHaveBeenCalled();
    expect(canAccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: String(creator.id) }),
    );
    getObject.mockRestore();
    canAccess.mockRestore();
  });

  it.each([
    ["image", "image/jpeg"],
    ["video", "video/mp4"],
  ] as const)("accepts creator-owned %s proof", async (mediaType, contentType) => {
    const objectPath = proofUrl(mediaType);
    const objectFile = {
      getMetadata: vi.fn().mockResolvedValue([{
        contentType,
        metadata: {
          "custom:aclPolicy": JSON.stringify({
            owner: String(creator.id),
            visibility: "private",
          }),
        },
      }]),
    };
    const getObject = vi
      .spyOn(ObjectStorageService.prototype, "getObjectEntityFile")
      .mockResolvedValue(objectFile as any);
    const canAccess = vi
      .spyOn(ObjectStorageService.prototype, "canAccessObjectEntity")
      .mockResolvedValue(true);

    const res = await request(appFor(creator))
      .post(`/api/habits/${habitId}/log`)
      .send({ minutesSpent: 10, proofUrl: objectPath, proofMediaType: mediaType });

    expect(res.status).toBe(201);
    expect(res.body.proofUrl).toBe(objectPath);
    expect(res.body.proofMediaType).toBe(mediaType);
    getObject.mockRestore();
    canAccess.mockRestore();
  });
});
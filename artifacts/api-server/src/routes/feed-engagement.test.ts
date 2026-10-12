import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { db } from "@workspace/db";
import postsRouter from "./studio-posts";
import commentsRouter from "./comments";

function appFor(signedIn: boolean) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (signedIn) Object.assign(req, { dbUser: { id: 7 } });
    next();
  });
  app.use("/api", postsRouter);
  app.use("/api", commentsRouter);
  return app;
}

describe.each([false, true])("retired feed engagement (signed in: %s)", (signedIn) => {
  it.each([
    ["post", "/api/studio-posts/9/like"],
    ["get", "/api/studio-posts/9/comments"],
    ["post", "/api/studio-posts/9/comments"],
  ] as const)("returns an explicit retirement response for %s %s without touching stored history", async (method, path) => {
    const writes = [vi.spyOn(db, "insert"), vi.spyOn(db, "update"), vi.spyOn(db, "delete"), vi.spyOn(db, "execute")];
    try {
      const response = await request(appFor(signedIn))[method](path).send({ content: "Legacy client comment" });
      expect(response.status).toBe(410);
      expect(response.body.error).toMatch(/Message the creator directly/);
      for (const write of writes) expect(write).not.toHaveBeenCalled();
    } finally {
      for (const write of writes) write.mockRestore();
    }
  });
});

it("keeps both mobile feed layouts message-only, without public engagement controls", () => {
  const source = readFileSync(new URL("../../../aimd-network/components/PostCard.tsx", import.meta.url), "utf8");
  expect(source).not.toMatch(/useLikeStudioPost|useAddPostComment|useListPostComments|like-post-|comment-post-|post\.likes/);
  expect(source).toContain("participantIds: [post.userId]");
  expect(source).toContain("pathname: '/conversation/[id]'");
  expect(source.match(/testID=\{`message-creator-/g)).toHaveLength(2);
  expect(source).toContain("const canMessageCreator = !!currentUserId && !isOwnPost");
});

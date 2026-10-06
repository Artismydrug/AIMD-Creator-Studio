import { Router, type IRouter } from "express";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import {
  db,
  studioPostsTable,
  studioPostMediaUploadsTable,
  postLikesTable,
  usersTable,
} from "@workspace/db";
import {
  ListStudioPostsQueryParams,
  ListStudioPostsResponse,
  CreateStudioPostBody,
  CreateStudioPostResponse,
  GetStudioPostParams,
  GetStudioPostResponse,
  DeleteStudioPostParams,
  LikeStudioPostParams,
  LikeStudioPostResponse,
} from "@workspace/api-zod";
import { createNotification, removeActiveNotification } from "../lib/notifications";

const router: IRouter = Router();

class UnverifiedStudioMediaError extends Error {}

function buildPostSelect(viewerUserId: number) {
  return {
    id: studioPostsTable.id,
    userId: studioPostsTable.userId,
    username: usersTable.username,
    userAvatarUrl: usersTable.avatarUrl,
    imageUrl: studioPostsTable.imageUrl,
    mediaType: studioPostsTable.mediaType,
    caption: studioPostsTable.caption,
    tags: studioPostsTable.tags,
    likes: studioPostsTable.likes,
    createdAt: studioPostsTable.createdAt,
    followerCount: sql<number>`(
      SELECT COUNT(*)::int FROM user_follows
      WHERE following_id = ${usersTable.id}
    )`,
    followingCount: sql<number>`(
      SELECT COUNT(*)::int FROM user_follows
      WHERE follower_id = ${usersTable.id}
    )`,
    followedByMe: sql<boolean>`EXISTS(
      SELECT 1 FROM user_follows
      WHERE follower_id = ${viewerUserId}
        AND following_id = ${usersTable.id}
    )`,
  };
}

router.get("/studio-posts", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const parsed = ListStudioPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 20;
  const offset = parsed.data.offset ?? 0;
  const filterUserId = parsed.data.userId ?? null;
  const followingOnly = parsed.data.followingOnly ?? false;
  const viewerUserId = req.dbUser?.id ?? -1;

  if (followingOnly && !req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const baseSelect = buildPostSelect(viewerUserId);

  const followingCondition = sql`${studioPostsTable.userId} IN (
    SELECT following_id FROM user_follows WHERE follower_id = ${viewerUserId}
  )`;
  const visibleCondition = sql`NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = ${viewerUserId}
      AND blocked_id = ${studioPostsTable.userId}
  )`;
  const posts = filterUserId && followingOnly
    ? await db
        .select(baseSelect)
        .from(studioPostsTable)
        .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
        .where(and(visibleCondition, eq(studioPostsTable.userId, filterUserId), followingCondition))
        .orderBy(desc(studioPostsTable.createdAt))
        .limit(limit)
        .offset(offset)
    : filterUserId
    ? await db
        .select(baseSelect)
        .from(studioPostsTable)
        .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
        .where(and(visibleCondition, eq(studioPostsTable.userId, filterUserId)))
        .orderBy(desc(studioPostsTable.createdAt))
        .limit(limit)
        .offset(offset)
    : followingOnly
    ? await db
        .select(baseSelect)
        .from(studioPostsTable)
        .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
        .where(and(visibleCondition, followingCondition))
        .orderBy(desc(studioPostsTable.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select(baseSelect)
        .from(studioPostsTable)
        .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
        .where(visibleCondition)
        .orderBy(desc(studioPostsTable.createdAt))
        .limit(limit)
        .offset(offset);

  const postIds = posts.map((p) => p.id);
  const likedSet = new Set<number>();

  if (postIds.length > 0 && !!req.dbUser) {
    const userId = req.dbUser!.id;
    const likes = await db
      .select()
      .from(postLikesTable)
      .where(eq(postLikesTable.userId, userId));
    likes.forEach((l) => likedSet.add(l.postId));
  }

  const result = posts.map((p) => ({ ...p, likedByMe: likedSet.has(p.id) }));
  res.json(ListStudioPostsResponse.parse(result));
});

router.post("/studio-posts", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const parsed = CreateStudioPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const requiresVerifiedMedia = parsed.data.mediaType === "video" || parsed.data.mediaType === "audio";
  const mediaLabel = parsed.data.mediaType === "audio" ? "Audio" : "Video";
  if (requiresVerifiedMedia && !parsed.data.imageUrl) {
    res.status(400).json({ error: `${mediaLabel} posts require an uploaded ${parsed.data.mediaType}` });
    return;
  }
  const mediaObjectPath =
    requiresVerifiedMedia && parsed.data.imageUrl?.startsWith("/api/storage/objects/")
      ? parsed.data.imageUrl.slice("/api/storage".length)
      : null;
  if (requiresVerifiedMedia && !mediaObjectPath) {
    res.status(400).json({ error: `${mediaLabel} posts require a validated Studio upload` });
    return;
  }

  let post: typeof studioPostsTable.$inferSelect;
  try {
    post = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(studioPostsTable)
        .values({ ...parsed.data, userId, tags: parsed.data.tags ?? [] })
        .returning();

      if (mediaObjectPath) {
        const [claimedUpload] = await tx
          .update(studioPostMediaUploadsTable)
          .set({ postId: created.id, consumedAt: new Date() })
          .where(
            and(
              eq(studioPostMediaUploadsTable.userId, userId),
              eq(studioPostMediaUploadsTable.objectPath, mediaObjectPath),
              eq(studioPostMediaUploadsTable.mediaType, parsed.data.mediaType as "video" | "audio"),
              isNull(studioPostMediaUploadsTable.postId),
              isNull(studioPostMediaUploadsTable.consumedAt),
            ),
          )
          .returning();
        if (!claimedUpload) throw new UnverifiedStudioMediaError();
      }
      return created;
    });
  } catch (error) {
    if (error instanceof UnverifiedStudioMediaError) {
      res.status(400).json({ error: `${mediaLabel} upload is missing, already used, or belongs to another creator` });
      return;
    }
    throw error;
  }

  const [freshPost] = await db
    .select(buildPostSelect(userId))
    .from(studioPostsTable)
    .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
    .where(eq(studioPostsTable.id, post.id));
  if (!freshPost) {
    res.status(500).json({ error: "Created post could not be loaded" });
    return;
  }
  res.status(201).json(
    CreateStudioPostResponse.parse({
      ...freshPost,
      likedByMe: false,
    })
  );
});

router.get("/studio-posts/:id", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const params = GetStudioPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewerUserId = req.dbUser?.id ?? -1;
  const visibleCondition = sql`NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = ${viewerUserId}
      AND blocked_id = ${studioPostsTable.userId}
  )`;
  const [post] = await db
    .select(buildPostSelect(viewerUserId))
    .from(studioPostsTable)
    .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
    .where(and(eq(studioPostsTable.id, params.data.id), visibleCondition));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  let likedByMe = false;
  if (!!req.dbUser) {
    const [like] = await db
      .select()
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, req.dbUser!.id)));
    likedByMe = !!like;
  }

  res.json(GetStudioPostResponse.parse({ ...post, likedByMe }));
});

router.delete("/studio-posts/:id", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = DeleteStudioPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .delete(studioPostsTable)
    .where(and(eq(studioPostsTable.id, params.data.id), eq(studioPostsTable.userId, userId)))
    .returning();
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/studio-posts/:id/like", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = LikeStudioPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(postLikesTable)
    .where(and(eq(postLikesTable.postId, params.data.id), eq(postLikesTable.userId, userId)));

  let likedByMe: boolean;
  let postOwnerId: number | undefined;
  if (existing) {
    await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
    await db
      .update(studioPostsTable)
      .set({ likes: sql`${studioPostsTable.likes} - 1` })
      .where(eq(studioPostsTable.id, params.data.id));
    likedByMe = false;
  } else {
    const ownerResult = await db.execute(sql`
      SELECT user_id FROM studio_posts WHERE id = ${params.data.id}
    `);
    postOwnerId = (ownerResult.rows[0] as { user_id?: number } | undefined)?.user_id;
    if (!postOwnerId) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const blocked = await db.execute(sql`
      SELECT 1 FROM user_blocks
      WHERE (blocker_id = ${userId} AND blocked_id = ${postOwnerId})
         OR (blocker_id = ${postOwnerId} AND blocked_id = ${userId})
      LIMIT 1
    `);
    if (blocked.rows.length > 0) {
      res.status(403).json({ error: "This creator is blocked." });
      return;
    }
    await db.insert(postLikesTable).values({ postId: params.data.id, userId });
    await db
      .update(studioPostsTable)
      .set({ likes: sql`${studioPostsTable.likes} + 1` })
      .where(eq(studioPostsTable.id, params.data.id));
    likedByMe = true;
  }

  const [post] = await db
    .select(buildPostSelect(userId))
    .from(studioPostsTable)
    .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
    .where(eq(studioPostsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (likedByMe) {
    await createNotification({
      recipientUserId: post.userId,
      actorUserId: userId,
      type: "like",
      postId: post.id,
    });
  } else {
    await removeActiveNotification({
      recipientUserId: post.userId,
      actorUserId: userId,
      type: "like",
      postId: post.id,
    });
  }
  res.json(LikeStudioPostResponse.parse({ ...post, likedByMe }));
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, studioPostsTable, postLikesTable, usersTable } from "@workspace/db";
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

const router: IRouter = Router();

router.get("/studio-posts", async (req, res): Promise<void> => {
  const parsed = ListStudioPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 20;
  const offset = parsed.data.offset ?? 0;
  const filterUserId = parsed.data.userId ?? null;

  const baseSelect = {
    id: studioPostsTable.id,
    userId: studioPostsTable.userId,
    username: usersTable.username,
    userAvatarUrl: usersTable.avatarUrl,
    imageUrl: studioPostsTable.imageUrl,
    caption: studioPostsTable.caption,
    tags: studioPostsTable.tags,
    likes: studioPostsTable.likes,
    createdAt: studioPostsTable.createdAt,
  };

  const posts = filterUserId
    ? await db
        .select(baseSelect)
        .from(studioPostsTable)
        .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
        .where(eq(studioPostsTable.userId, filterUserId))
        .orderBy(desc(studioPostsTable.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select(baseSelect)
        .from(studioPostsTable)
        .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
        .orderBy(desc(studioPostsTable.createdAt))
        .limit(limit)
        .offset(offset);

  const postIds = posts.map((p) => p.id);
  const likedSet = new Set<number>();

  if (postIds.length > 0 && req.isAuthenticated()) {
    const userId = req.user.id;
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
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const parsed = CreateStudioPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [post] = await db
    .insert(studioPostsTable)
    .values({ ...parsed.data, userId, tags: parsed.data.tags ?? [] })
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json(
    CreateStudioPostResponse.parse({
      ...post,
      username: user?.username ?? "creator",
      userAvatarUrl: user?.avatarUrl ?? null,
      likedByMe: false,
    })
  );
});

router.get("/studio-posts/:id", async (req, res): Promise<void> => {
  const params = GetStudioPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .select({
      id: studioPostsTable.id,
      userId: studioPostsTable.userId,
      username: usersTable.username,
      userAvatarUrl: usersTable.avatarUrl,
      imageUrl: studioPostsTable.imageUrl,
      caption: studioPostsTable.caption,
      tags: studioPostsTable.tags,
      likes: studioPostsTable.likes,
      createdAt: studioPostsTable.createdAt,
    })
    .from(studioPostsTable)
    .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
    .where(eq(studioPostsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  let likedByMe = false;
  if (req.isAuthenticated()) {
    const [like] = await db
      .select()
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, req.user.id)));
    likedByMe = !!like;
  }

  res.json(GetStudioPostResponse.parse({ ...post, likedByMe }));
});

router.delete("/studio-posts/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

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
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

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
  if (existing) {
    await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
    await db
      .update(studioPostsTable)
      .set({ likes: sql`${studioPostsTable.likes} - 1` })
      .where(eq(studioPostsTable.id, params.data.id));
    likedByMe = false;
  } else {
    await db.insert(postLikesTable).values({ postId: params.data.id, userId });
    await db
      .update(studioPostsTable)
      .set({ likes: sql`${studioPostsTable.likes} + 1` })
      .where(eq(studioPostsTable.id, params.data.id));
    likedByMe = true;
  }

  const [post] = await db
    .select({
      id: studioPostsTable.id,
      userId: studioPostsTable.userId,
      username: usersTable.username,
      userAvatarUrl: usersTable.avatarUrl,
      imageUrl: studioPostsTable.imageUrl,
      caption: studioPostsTable.caption,
      tags: studioPostsTable.tags,
      likes: studioPostsTable.likes,
      createdAt: studioPostsTable.createdAt,
    })
    .from(studioPostsTable)
    .innerJoin(usersTable, eq(studioPostsTable.userId, usersTable.id))
    .where(eq(studioPostsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(LikeStudioPostResponse.parse({ ...post, likedByMe }));
});

export default router;

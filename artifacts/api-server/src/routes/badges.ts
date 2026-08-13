import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, badgesTable, workshopsTable } from "@workspace/db";
import { ListBadgesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/badges", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const badges = await db
    .select()
    .from(badgesTable)
    .where(eq(badgesTable.userId, userId))
    .orderBy(desc(badgesTable.earnedAt));

  const workshopIds = badges.map((b) => b.workshopId).filter((id): id is number => id !== null);
  const workshopsData = workshopIds.length > 0 ? await db.select().from(workshopsTable) : [];
  const workshopMap = new Map(workshopsData.map((w) => [w.id, w]));

  const result = badges.map((b) => ({
    ...b,
    workshopTitle: b.workshopId ? (workshopMap.get(b.workshopId)?.title ?? null) : null,
  }));
  res.json(ListBadgesResponse.parse(result));
});

export default router;

import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, badgesTable, workshopsTable } from "@workspace/db";
import { ListBadgesResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const CURRENT_USER_ID = 1;

router.get("/badges", async (req, res): Promise<void> => {
  const badges = await db
    .select()
    .from(badgesTable)
    .where(eq(badgesTable.userId, CURRENT_USER_ID))
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

import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, enrollmentsTable, workshopsTable } from "@workspace/db";
import { ListEnrollmentsResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const CURRENT_USER_ID = 1;

router.get("/enrollments", async (req, res): Promise<void> => {
  const enrollments = await db
    .select()
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, CURRENT_USER_ID))
    .orderBy(desc(enrollmentsTable.createdAt));

  const workshopIds = enrollments.map((e) => e.workshopId);
  const workshopsData = workshopIds.length > 0
    ? await db.select().from(workshopsTable)
    : [];
  const workshopMap = new Map(workshopsData.map((w) => [w.id, w]));

  const result = enrollments.map((e) => {
    const workshop = workshopMap.get(e.workshopId);
    const totalModules = workshop?.totalModules ?? 0;
    return {
      ...e,
      workshopTitle: workshop?.title ?? "",
      workshopThumbnailUrl: workshop?.thumbnailUrl ?? null,
      totalModules,
      progressPercent: totalModules > 0 ? (e.completedModules / totalModules) * 100 : 0,
    };
  });

  res.json(ListEnrollmentsResponse.parse(result));
});

export default router;

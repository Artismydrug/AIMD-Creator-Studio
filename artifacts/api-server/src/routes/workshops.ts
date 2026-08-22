import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, workshopsTable, workshopModulesTable, enrollmentsTable, completedModulesTable } from "@workspace/db";
import {
  ListWorkshopsQueryParams,
  ListWorkshopsResponse,
  GetWorkshopParams,
  GetWorkshopResponse,
  EnrollInWorkshopParams,
  EnrollInWorkshopResponse,
  CompleteWorkshopModuleParams,
  CompleteWorkshopModuleResponse,
} from "@workspace/api-zod";
import { getCurrentTier, hasRequiredTier, type Tier } from "../middleware/requireTier";

const router: IRouter = Router();

function minimumTierForWorkshop(tier: string): Tier {
  return tier === "pro" ? "pro" : tier === "workshop" ? "academy" : "free";
}

async function canAccessWorkshop(req: any, workshopTier: string): Promise<boolean> {
  const requiredTier = minimumTierForWorkshop(workshopTier);
  if (requiredTier === "free") return true;
  if (!req.dbUser) return false;
  return hasRequiredTier(await getCurrentTier(req.dbUser.id), requiredTier);
}

router.get("/workshops", async (req, res): Promise<void> => {
  const parsed = ListWorkshopsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let workshops = await db.select().from(workshopsTable).orderBy(desc(workshopsTable.createdAt));

  if (parsed.data.tier) {
    workshops = workshops.filter((w) => w.tier === parsed.data.tier);
  }
  if (parsed.data.category) {
    workshops = workshops.filter((w) =>
      w.category.toLowerCase().includes((parsed.data.category as string).toLowerCase())
    );
  }

  const enrolledSet = new Set<number>();
  if (!!req.dbUser) {
    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, req.dbUser!.id));
    enrollments.forEach((e) => enrolledSet.add(e.workshopId));
  }

  const result = workshops.map((w) => ({ ...w, isEnrolled: enrolledSet.has(w.id) }));
  res.json(ListWorkshopsResponse.parse(result));
});

router.get("/workshops/:id", async (req, res): Promise<void> => {
  const params = GetWorkshopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  if (!(await canAccessWorkshop(req, workshop.tier))) {
    res.status(req.dbUser ? 403 : 401).json({ error: "tier_required", requiredTier: minimumTierForWorkshop(workshop.tier) });
    return;
  }

  const modules = await db
    .select()
    .from(workshopModulesTable)
    .where(eq(workshopModulesTable.workshopId, workshop.id))
    .orderBy(workshopModulesTable.order);

  const [enrollment] = !!req.dbUser
    ? await db
        .select()
        .from(enrollmentsTable)
        .where(and(eq(enrollmentsTable.workshopId, workshop.id), eq(enrollmentsTable.userId, req.dbUser!.id)))
    : [undefined];

  let completedSet = new Set<number>();
  if (enrollment) {
    const completed = await db
      .select()
      .from(completedModulesTable)
      .where(eq(completedModulesTable.enrollmentId, enrollment.id));
    completedSet = new Set(completed.map((c) => c.moduleId));
  }

  const modulesWithStatus = modules.map((m) => ({ ...m, isCompleted: completedSet.has(m.id) }));

  res.json(
    GetWorkshopResponse.parse({
      ...workshop,
      modules: modulesWithStatus,
      isEnrolled: !!enrollment,
    })
  );
});

router.post("/workshops/:id/enroll", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = EnrollInWorkshopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  if (!(await canAccessWorkshop(req, workshop.tier))) {
    res.status(403).json({ error: "tier_required", requiredTier: minimumTierForWorkshop(workshop.tier) });
    return;
  }

  const [existing] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.workshopId, params.data.id), eq(enrollmentsTable.userId, userId)));

  if (existing) {
    res.status(201).json(
      EnrollInWorkshopResponse.parse({
        ...existing,
        workshopTitle: workshop.title,
        workshopThumbnailUrl: workshop.thumbnailUrl,
        totalModules: workshop.totalModules,
        progressPercent: workshop.totalModules > 0 ? (existing.completedModules / workshop.totalModules) * 100 : 0,
      })
    );
    return;
  }

  const [enrollment] = await db
    .insert(enrollmentsTable)
    .values({ userId, workshopId: params.data.id, completedModules: 0, status: "active" })
    .returning();

  // bump enrolled count
  await db
    .update(workshopsTable)
    .set({ enrolledCount: workshop.enrolledCount + 1 })
    .where(eq(workshopsTable.id, params.data.id));

  res.status(201).json(
    EnrollInWorkshopResponse.parse({
      ...enrollment,
      workshopTitle: workshop.title,
      workshopThumbnailUrl: workshop.thumbnailUrl,
      totalModules: workshop.totalModules,
      progressPercent: 0,
    })
  );
});

router.post("/workshops/:id/modules/:moduleId/complete", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const params = CompleteWorkshopModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  if (!(await canAccessWorkshop(req, workshop.tier))) {
    res.status(403).json({ error: "tier_required", requiredTier: minimumTierForWorkshop(workshop.tier) });
    return;
  }

  const [module] = await db
    .select({ id: workshopModulesTable.id })
    .from(workshopModulesTable)
    .where(and(
      eq(workshopModulesTable.id, params.data.moduleId),
      eq(workshopModulesTable.workshopId, params.data.id),
    ));
  if (!module) {
    res.status(400).json({ error: "Module does not belong to this workshop" });
    return;
  }

  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.workshopId, params.data.id), eq(enrollmentsTable.userId, userId)));
  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found — enroll first" });
    return;
  }

  const [alreadyDone] = await db
    .select()
    .from(completedModulesTable)
    .where(
      and(
        eq(completedModulesTable.enrollmentId, enrollment.id),
        eq(completedModulesTable.moduleId, params.data.moduleId)
      )
    );

  if (!alreadyDone) {
    await db.insert(completedModulesTable).values({
      enrollmentId: enrollment.id,
      moduleId: params.data.moduleId,
    });
    const newCompleted = enrollment.completedModules + 1;
    const totalModules = workshop?.totalModules ?? 1;
    const progressPercent = (newCompleted / totalModules) * 100;
    const status = newCompleted >= totalModules ? "completed" : "active";

    const [updated] = await db
      .update(enrollmentsTable)
      .set({ completedModules: newCompleted, status })
      .where(eq(enrollmentsTable.id, enrollment.id))
      .returning();

    res.json(
      CompleteWorkshopModuleResponse.parse({
        ...updated,
        workshopTitle: workshop?.title ?? "",
        workshopThumbnailUrl: workshop?.thumbnailUrl ?? null,
        totalModules,
        progressPercent,
      })
    );
    return;
  }

  const totalModules = workshop?.totalModules ?? 1;
  res.json(
    CompleteWorkshopModuleResponse.parse({
      ...enrollment,
      workshopTitle: workshop?.title ?? "",
      workshopThumbnailUrl: workshop?.thumbnailUrl ?? null,
      totalModules,
      progressPercent: totalModules > 0 ? (enrollment.completedModules / totalModules) * 100 : 0,
    })
  );
});

export default router;

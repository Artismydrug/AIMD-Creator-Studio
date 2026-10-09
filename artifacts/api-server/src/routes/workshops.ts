import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, asc, desc, inArray, isNotNull } from "drizzle-orm";
import {
  db,
  workshopsTable,
  workshopModulesTable,
  enrollmentsTable,
  completedModulesTable,
  drillPromptsTable,
  workshopInstructorsTable,
  instructorProfilesTable,
  userRolesTable,
} from "@workspace/db";
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
import { getWorkshopLessonAccess } from "../lib/workshopLessonAccess";

const router: IRouter = Router();

/**
 * The public API's workshop tier vocabulary is "free" | "workshop" | "pro".
 * Any stored legacy "academy" row is presented as "workshop" so response
 * validation never fails on old data (access checks treat both as paid).
 */
function normalizeWorkshopTier<T extends { tier: string }>(workshop: T): T {
  return workshop.tier === "academy" ? { ...workshop, tier: "workshop" } : workshop;
}

/**
 * Assigned instructors (and admins) may READ a workshop's curriculum
 * regardless of their own membership tier — teaching a workshop must not
 * require paying for it. Write access is still governed by the instructor
 * routes' own assignment checks.
 */
async function ensureWorkshopAccess(
  req: Request,
  res: Response,
  workshopId: number,
): Promise<boolean> {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  const access = await getWorkshopLessonAccess(req.dbUser.id, workshopId);
  if (access.accessStatus === "unavailable") {
    res.status(503).json({
      error: "membership_check_unavailable",
      message: "Membership access could not be verified. Please try again.",
    });
    return false;
  }
  if (!access.hasFullAccess) {
    res.status(403).json({
      error: "lesson_access_required", requiredTier: "academy",
      message: "An active $39 Dedicated Artist subscription or enrollment as a participant in this workshop is required.",
    });
    return false;
  }
  const [workshop] = await db.select({ isPublished: workshopsTable.isPublished })
    .from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!workshop?.isPublished && !access.isStaff && !access.hasParticipantAccess) {
    res.status(404).json({ error: "Workshop not found" });
    return false;
  }
  return true;
}

router.get("/workshops", async (req, res): Promise<void> => {
  const parsed = ListWorkshopsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let workshops = await db.select().from(workshopsTable).orderBy(desc(workshopsTable.createdAt));

  if (parsed.data.tier) {
    const requestedTier = parsed.data.tier === "academy" ? "workshop" : parsed.data.tier;
    workshops = workshops.filter((w) => normalizeWorkshopTier(w).tier === requestedTier);
  }
  if (parsed.data.category) {
    workshops = workshops.filter((w) =>
      w.category.toLowerCase().includes((parsed.data.category as string).toLowerCase())
    );
  }

  const enrolledSet = new Set<number>();
  const privateAccessSet = new Set<number>();
  const moduleTeasers = await db
    .select({
      workshopId: workshopModulesTable.workshopId,
      previewVideoUrl: workshopModulesTable.previewVideoUrl,
    })
    .from(workshopModulesTable)
    .where(isNotNull(workshopModulesTable.previewVideoUrl))
    .orderBy(asc(workshopModulesTable.order));
  const firstModuleTeaserByWorkshop = new Map<number, string>();
  for (const module of moduleTeasers) {
    if (module.previewVideoUrl && !firstModuleTeaserByWorkshop.has(module.workshopId)) {
      firstModuleTeaserByWorkshop.set(module.workshopId, module.previewVideoUrl);
    }
  }

  if (!!req.dbUser) {
    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, req.dbUser!.id));
    enrollments.forEach((e) => {
      if (e.status === "active" || e.status === "completed") {
        enrolledSet.add(e.workshopId);
        if (e.accessSource === "participant") privateAccessSet.add(e.workshopId);
      }
    });
    const assigned = await db.select({ workshopId: workshopInstructorsTable.workshopId })
      .from(workshopInstructorsTable)
      .innerJoin(instructorProfilesTable, eq(instructorProfilesTable.id, workshopInstructorsTable.instructorId))
      .innerJoin(userRolesTable, eq(userRolesTable.userId, instructorProfilesTable.userId))
      .where(and(eq(instructorProfilesTable.userId, req.dbUser.id), inArray(userRolesTable.role, ["instructor", "admin"])));
    assigned.forEach((row) => privateAccessSet.add(row.workshopId));
  }

  const result = workshops
    .filter((w) => w.isPublished || req.dbUser?.isAdmin || privateAccessSet.has(w.id))
    .map((w) => {
      const normalized = normalizeWorkshopTier({ ...w, isEnrolled: enrolledSet.has(w.id) });
      return {
        ...normalized,
        previewVideoUrl:
          normalized.previewVideoUrl ?? firstModuleTeaserByWorkshop.get(w.id) ?? null,
      };
    });
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
  const access = await getWorkshopLessonAccess(req.dbUser?.id, workshop.id);
  if (!workshop.isPublished && !access.isStaff && !access.hasParticipantAccess) {
    res.status(404).json({ error: "Workshop not found" });
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

  const readableModules = modules;
  const drills = access.hasFullAccess && readableModules.length > 0
    ? await db
        .select()
        .from(drillPromptsTable)
        .where(inArray(drillPromptsTable.moduleId, readableModules.map((module) => module.id)))
    : [];
  const drillsByModule = new Map<number, typeof drills>();
  for (const drill of drills) {
    const current = drillsByModule.get(drill.moduleId) ?? [];
    current.push(drill);
    drillsByModule.set(drill.moduleId, current);
  }
  const modulesWithStatus = readableModules.map((m) => ({
    ...m,
    description: access.hasFullAccess ? m.description : null,
    videoUrl: access.isStaff ? m.videoUrl : null,
    hasVideo: !!m.videoUrl,
    isLocked: !access.hasFullAccess,
    isCompleted: completedSet.has(m.id),
    drills: drillsByModule.get(m.id) ?? [],
  }));

  res.json(
    GetWorkshopResponse.parse(
      normalizeWorkshopTier({
        ...workshop,
        modules: modulesWithStatus,
        isEnrolled: !!enrollment && enrollment.status !== "paused",
        hasFullAccess: access.hasFullAccess,
        isStaff: access.isStaff,
        accessStatus: access.accessStatus,
      })
    )
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
  if (!(await ensureWorkshopAccess(req, res, workshop.id))) return;

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
    .values({ userId, workshopId: params.data.id, completedModules: 0, status: "active", accessSource: "subscription" })
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
  if (!(await ensureWorkshopAccess(req, res, workshop.id))) return;

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
  if (enrollment.status === "paused") {
    res.status(403).json({ error: "Enrollment is paused. Contact your instructor." });
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

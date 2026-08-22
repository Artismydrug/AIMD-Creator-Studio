import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, assignmentsTable, workshopsTable, workshopModulesTable, enrollmentsTable } from "@workspace/db";
import {
  ListAssignmentsResponse,
  SubmitAssignmentBody,
  SubmitAssignmentResponse,
  GetAssignmentParams,
  GetAssignmentResponse,
} from "@workspace/api-zod";
import { requireTier } from "../middleware/requireTier";
import { ObjectStorageService } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.get("/assignments", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.userId, userId))
    .orderBy(desc(assignmentsTable.submittedAt));

  const workshopIds = [...new Set(assignments.map((a) => a.workshopId))];
  const workshopsData = workshopIds.length > 0 ? await db.select().from(workshopsTable) : [];
  const workshopMap = new Map(workshopsData.map((w) => [w.id, w]));

  const result = assignments.map((a) => ({
    ...a,
    workshopTitle: workshopMap.get(a.workshopId)?.title ?? null,
  }));
  res.json(ListAssignmentsResponse.parse(result));
});

// Assignment submission requires Academy Pass or above
router.post("/assignments", requireTier("academy"), async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const parsed = SubmitAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, parsed.data.workshopId));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  const [module] = await db
    .select({ id: workshopModulesTable.id })
    .from(workshopModulesTable)
    .where(and(
      eq(workshopModulesTable.id, parsed.data.moduleId),
      eq(workshopModulesTable.workshopId, parsed.data.workshopId),
    ));
  if (!module) {
    res.status(400).json({ error: "Module does not belong to this workshop" });
    return;
  }
  const [enrollment] = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(and(
      eq(enrollmentsTable.userId, userId),
      eq(enrollmentsTable.workshopId, parsed.data.workshopId),
    ));
  if (!enrollment) {
    res.status(403).json({ error: "Enroll in this workshop before submitting an assignment" });
    return;
  }
  if (parsed.data.submissionUrl) {
    const prefix = "/api/storage";
    if (!parsed.data.submissionUrl.startsWith(`${prefix}/objects/`)) {
      res.status(400).json({ error: "Assignment footage must be uploaded through The Warehouse" });
      return;
    }
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(parsed.data.submissionUrl.slice(prefix.length));
      const ownsObject = await objectStorageService.canAccessObjectEntity({
        userId: String(userId),
        objectFile,
        requestedPermission: ObjectPermission.WRITE,
      });
      if (!ownsObject) {
        res.status(403).json({ error: "Assignment footage does not belong to this creator" });
        return;
      }
    } catch {
      res.status(400).json({ error: "Assignment footage could not be verified" });
      return;
    }
  }

  const [assignment] = await db
    .insert(assignmentsTable)
    .values({ ...parsed.data, userId, status: "pending" })
    .returning();

  res.status(201).json(
    SubmitAssignmentResponse.parse({
      ...assignment,
      workshopTitle: workshop?.title ?? null,
    })
  );
});

router.get("/assignments/:id", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, params.data.id));
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  if (assignment.userId !== req.dbUser.id && !req.dbUser.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, assignment.workshopId));
  res.json(GetAssignmentResponse.parse({ ...assignment, workshopTitle: workshop?.title ?? null }));
});

export default router;

import { Router, type IRouter } from "express";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  workshopsTable,
  workshopModulesTable,
  enrollmentsTable,
  assignmentExtensionsTable,
  assignmentMediaUploadsTable,
} from "@workspace/db";
import {
  ListAssignmentsResponse,
  SubmitAssignmentBody,
  SubmitAssignmentResponse,
  GetAssignmentParams,
  GetAssignmentResponse,
  SubmitLessonReflectionBody,
  SubmitLessonReflectionResponse,
} from "@workspace/api-zod";
import { getWorkshopLessonAccess } from "../lib/workshopLessonAccess";

const router: IRouter = Router();

/** Prefix the client uses to reference a served private object. */
const STORAGE_URL_PREFIX = "/api/storage";
export const LESSON_REFLECTION_PROMPT = "What did you try from this lesson, and what will you practice next?";

/**
 * Normalize a client submissionUrl to the stored object_path form.
 * Accepts `/api/storage/objects/...` and returns `/objects/...`; returns null
 * if the URL is not a private served-object reference.
 */
function submissionUrlToObjectPath(submissionUrl: string): string | null {
  if (submissionUrl.startsWith(`${STORAGE_URL_PREFIX}/objects/`)) {
    return submissionUrl.slice(STORAGE_URL_PREFIX.length); // -> /objects/...
  }
  return null;
}

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
  const moduleIds = [...new Set(assignments.map((a) => a.moduleId))];
  const modules = moduleIds.length > 0
    ? await db.select({ id: workshopModulesTable.id, title: workshopModulesTable.title })
        .from(workshopModulesTable).where(inArray(workshopModulesTable.id, moduleIds))
    : [];
  const moduleMap = new Map(modules.map((m) => [m.id, m.title]));

  const result = assignments.map((a) => ({
    ...a,
    workshopTitle: workshopMap.get(a.workshopId)?.title ?? null,
    moduleTitle: moduleMap.get(a.moduleId) ?? null,
  }));
  res.json(ListAssignmentsResponse.parse(result));
});

// Text-only learning evidence has its own endpoint. It never bypasses the
// recorded-footage requirements of /assignments and is never a public post.
router.post("/workshop-reflections", async (req, res): Promise<void> => {
  if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = SubmitLessonReflectionBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.responseText.trim()) {
    res.status(400).json({ error: "A reflection of 1–1500 characters is required" });
    return;
  }
  const { workshopId, moduleId } = parsed.data;
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
  const access = await getWorkshopLessonAccess(req.dbUser.id, workshopId);
  if (!access.hasFullAccess) {
    res.status(access.accessStatus === "unavailable" ? 503 : 403).json({
      error: access.accessStatus === "unavailable" ? "membership_check_unavailable" : "lesson_access_required",
    });
    return;
  }
  if (!workshop.isPublished && !access.isStaff && !access.hasParticipantAccess) {
    res.status(404).json({ error: "Workshop not found" }); return;
  }
  const [module] = await db.select().from(workshopModulesTable).where(and(
    eq(workshopModulesTable.id, moduleId), eq(workshopModulesTable.workshopId, workshopId),
  ));
  if (!module) { res.status(400).json({ error: "Module does not belong to this workshop" }); return; }
  if (!module.videoUrl) { res.status(409).json({ error: "Reflections open when the full lesson is released" }); return; }
  const [enrollment] = await db.select().from(enrollmentsTable).where(and(
    eq(enrollmentsTable.userId, req.dbUser.id), eq(enrollmentsTable.workshopId, workshopId),
  ));
  if (!enrollment || enrollment.status === "paused") {
    res.status(403).json({ error: "An active workshop enrollment is required" }); return;
  }
  const [reflection] = await db.insert(assignmentsTable).values({
    userId: req.dbUser.id,
    workshopId,
    moduleId,
    submissionKind: "lesson_reflection",
    reflectionPrompt: LESSON_REFLECTION_PROMPT,
    submissionNote: parsed.data.responseText.trim(),
    status: "pending",
  }).returning();
  res.status(201).json(SubmitLessonReflectionResponse.parse({
    ...reflection, workshopTitle: workshop.title, moduleTitle: module.title,
  }));
});

// Assignments use the same verified subscription/participant gate as lessons.
router.post("/assignments", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  const parsed = SubmitAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // A recorded, ffprobe-gated upload is REQUIRED. This is what enforces that
  // the submission is an actual drill video that passed the 30-second check.
  if (!parsed.data.submissionUrl) {
    res.status(400).json({ error: "Assignment footage is required" });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, parsed.data.workshopId));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  const access = await getWorkshopLessonAccess(userId, workshop.id);
  if (!access.hasFullAccess) {
    res.status(access.accessStatus === "unavailable" ? 503 : 403).json({
      error: access.accessStatus === "unavailable" ? "membership_check_unavailable" : "lesson_access_required",
      message: "An active $39 subscription or enrollment in this workshop is required.",
    });
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
    .select({ id: enrollmentsTable.id, status: enrollmentsTable.status })
    .from(enrollmentsTable)
    .where(and(
      eq(enrollmentsTable.userId, userId),
      eq(enrollmentsTable.workshopId, parsed.data.workshopId),
    ));
  if (!enrollment) {
    res.status(403).json({ error: "Enroll in this workshop before submitting an assignment" });
    return;
  }
  if (enrollment.status === "paused") {
    res.status(403).json({ error: "This workshop enrollment is paused" });
    return;
  }

  // The submissionUrl must be a private served-object reference.
  const objectPath = submissionUrlToObjectPath(parsed.data.submissionUrl);
  if (!objectPath) {
    res.status(400).json({ error: "Assignment footage must be uploaded through the Workshops & Masterclasses upload service" });
    return;
  }

  // Look up the durable, ffprobe-gated upload record. It must:
  //   1. exist, 2. be owned by this user, 3. be unconsumed.
  // We never trust a client-supplied duration; the recorded value is authoritative.
  const [upload] = await db
    .select()
    .from(assignmentMediaUploadsTable)
    .where(eq(assignmentMediaUploadsTable.objectPath, objectPath))
    .limit(1);

  if (!upload) {
    res.status(400).json({ error: "Assignment footage was not recorded as a valid drill upload" });
    return;
  }
  if (upload.userId !== userId) {
    res.status(403).json({ error: "Assignment footage does not belong to this creator" });
    return;
  }
  if (upload.consumedAt !== null || upload.claimedAssignmentId !== null) {
    res.status(409).json({ error: "This assignment footage has already been submitted" });
    return;
  }

  // Create the assignment, its extension row, and consume the upload atomically.
  // If the upload was consumed concurrently, the guarded UPDATE affects 0 rows
  // and the whole transaction is rolled back.
  let assignment: typeof assignmentsTable.$inferSelect;
  try {
    assignment = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(assignmentsTable)
        .values({
          userId,
          workshopId: parsed.data.workshopId,
          moduleId: parsed.data.moduleId,
          submissionUrl: parsed.data.submissionUrl,
          submissionNote: parsed.data.submissionNote ?? null,
          status: "pending",
        })
        .returning();

      // Bind + consume the upload with a guard so concurrent submissions can't
      // reuse the same footage. Only an unconsumed row owned by the user matches.
      const consumed = await tx
        .update(assignmentMediaUploadsTable)
        .set({ claimedAssignmentId: inserted.id, consumedAt: new Date() })
        .where(
          and(
            eq(assignmentMediaUploadsTable.id, upload.id),
            eq(assignmentMediaUploadsTable.userId, userId),
            isNull(assignmentMediaUploadsTable.consumedAt),
            isNull(assignmentMediaUploadsTable.claimedAssignmentId),
          ),
        )
        .returning({ id: assignmentMediaUploadsTable.id });

      if (consumed.length === 0) {
        // Lost the race — abort so no assignment references reused footage.
        throw new Error("UPLOAD_ALREADY_CONSUMED");
      }

      // Persist authoritative capture metadata from the SERVER record.
      await tx.insert(assignmentExtensionsTable).values({
        assignmentId: inserted.id,
        captureSource: upload.captureSource,
        measuredDurationSeconds: upload.measuredDurationSeconds,
      });

      return inserted;
    });
  } catch (err: any) {
    if (err?.message === "UPLOAD_ALREADY_CONSUMED") {
      res.status(409).json({ error: "This assignment footage has already been submitted" });
      return;
    }
    throw err;
  }

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

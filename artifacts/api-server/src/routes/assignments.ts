import { Router, type IRouter } from "express";
import { eq, desc, and, isNull } from "drizzle-orm";
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
} from "@workspace/api-zod";
import { requireTier } from "../middleware/requireTier";

const router: IRouter = Router();

/** Prefix the client uses to reference a served private object. */
const STORAGE_URL_PREFIX = "/api/storage";

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

  const result = assignments.map((a) => ({
    ...a,
    workshopTitle: workshopMap.get(a.workshopId)?.title ?? null,
  }));
  res.json(ListAssignmentsResponse.parse(result));
});

// Assignment submission requires the Dedicated Artist plan or above
router.post("/assignments", requireTier("academy"), async (req, res): Promise<void> => {
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

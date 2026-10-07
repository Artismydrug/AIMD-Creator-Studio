import { Router, type IRouter, type RequestHandler } from "express";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  db, usersTable, workshopsTable, workshopModulesTable, workshopVideoUploadsTable, enrollmentsTable,
} from "@workspace/db";
import {
  RequestWorkshopVideoUploadBody, FinalizeWorkshopVideoUploadBody,
  UpdateInstructorWorkshopBody, UpdateWorkshopModuleBody, EnrollWorkshopParticipantBody,
  ListWorkshopParticipantsResponse, EnrollWorkshopParticipantResponse,
  CreateWorkshopLessonPlaybackParams, CreateWorkshopLessonPlaybackResponse,
  UpdateInstructorWorkshopResponse, UpdateWorkshopModuleResponse,
} from "@workspace/api-zod";
import { requireInstructor } from "../middlewares/requireInstructor";
import { getWorkshopLessonAccess, isWorkshopStaff } from "../lib/workshopLessonAccess";
import { isValidWorkshopMediaReference, workshopMediaObjectPath } from "../lib/workshopVideoMedia";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const PREVIEW_LIMIT = 50 * 1024 * 1024;
const PLAYBACK_TTL = 900;

const assignedStaff: RequestHandler = async (req, res, next) => {
  const workshopId = Number(req.params.workshopId);
  if (!Number.isSafeInteger(workshopId) || workshopId < 1) {
    res.status(400).json({ error: "Invalid workshop ID" }); return;
  }
  const [workshop] = await db.select({ id: workshopsTable.id }).from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
  if (!req.dbUser || !(await isWorkshopStaff(req.dbUser.id, workshopId))) {
    res.status(403).json({ error: "You are not assigned to this workshop" }); return;
  }
  next();
};
const staff = [requireInstructor, assignedStaff];

router.post("/instructor/workshops/:workshopId/videos/request-upload", ...staff, async (req, res) => {
  const parsed = RequestWorkshopVideoUploadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const workshopId = Number(req.params.workshopId);
  const input = parsed.data;
  if (input.kind === "preview" && input.size > PREVIEW_LIMIT) {
    res.status(400).json({ error: "Preview clips must be 50 MB or smaller" }); return;
  }
  const pending = await db.select({ id: workshopVideoUploadsTable.id }).from(workshopVideoUploadsTable).where(and(
    eq(workshopVideoUploadsTable.userId, req.dbUser!.id),
    isNull(workshopVideoUploadsTable.readyAt),
    gt(workshopVideoUploadsTable.createdAt, new Date(Date.now() - 3600_000)),
  )).limit(20);
  if (pending.length >= 20) { res.status(429).json({ error: "Too many pending uploads. Please try again later." }); return; }
  const destination = await storage.requestWorkshopVideoUpload();
  await db.insert(workshopVideoUploadsTable).values({
    workshopId, userId: req.dbUser!.id, objectPath: destination.objectPath,
    kind: input.kind, contentType: input.contentType, expectedSize: input.size,
  });
  res.setHeader("Cache-Control", "no-store");
  res.json(destination);
});

router.post("/instructor/workshops/:workshopId/videos/finalize", ...staff, async (req, res) => {
  const parsed = FinalizeWorkshopVideoUploadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const workshopId = Number(req.params.workshopId);
  const [initial] = await db.select().from(workshopVideoUploadsTable).where(and(
    eq(workshopVideoUploadsTable.objectPath, parsed.data.objectPath),
    eq(workshopVideoUploadsTable.workshopId, workshopId),
    eq(workshopVideoUploadsTable.userId, req.dbUser!.id),
  ));
  if (!initial) { res.status(404).json({ error: "Upload not found for this creator and workshop" }); return; }
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(71320, ${initial.id})`);
      const [upload] = await tx.select().from(workshopVideoUploadsTable).where(eq(workshopVideoUploadsTable.id, initial.id));
      if (upload.readyAt && upload.mediaPath) return upload.mediaPath;
      if (Date.now() - upload.createdAt.getTime() > 3600_000) throw new Error("upload_expired");
      const file = await storage.getObjectEntityFile(upload.objectPath);
      const [metadata] = await file.getMetadata();
      if (Number(metadata.size) !== upload.expectedSize || metadata.contentType !== upload.contentType) {
        throw new Error("invalid_video");
      }
      // Pin the generation so a concurrent/still-valid PUT cannot swap the
      // checked bytes before the immutable copy is made.
      const snapshot = file.bucket.file(file.name, { generation: metadata.generation });
      const [header] = await snapshot.download({ start: 0, end: Math.min(upload.expectedSize - 1, 4095) });
      const valid = upload.contentType === "video/webm"
        ? header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        : header.length >= 12 && header.subarray(4, 8).toString("ascii") === "ftyp";
      if (!valid) throw new Error("invalid_video");
      const mediaPath = await storage.finalizeWorkshopVideo(snapshot, String(upload.userId), upload.kind === "preview" ? "public" : "private");
      await tx.update(workshopVideoUploadsTable).set({ mediaPath, readyAt: new Date() })
        .where(eq(workshopVideoUploadsTable.id, upload.id));
      await file.delete({ ignoreNotFound: true }).catch((error) => {
        req.log.warn({ err: error, uploadId: upload.id }, "Workshop staging cleanup failed");
      });
      return mediaPath;
    });
    res.json({ objectPath: result, mediaUrl: `/api/storage${result}` });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(400).json({ error: "Upload the video file before finalizing it" }); return;
    }
    if (error instanceof Error && ["invalid_video", "upload_expired"].includes(error.message)) {
      res.status(400).json({ error: error.message === "upload_expired" ? "Upload expired. Please upload the video again." : "The uploaded file does not match the selected video. Please upload a valid MP4, MOV or WebM file." }); return;
    }
    throw error;
  }
});

router.patch("/instructor/workshops/:workshopId", ...staff, async (req, res) => {
  const parsed = UpdateInstructorWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const workshopId = Number(req.params.workshopId);
  if (!(await isValidWorkshopMediaReference(parsed.data.previewVideoUrl, workshopId, "preview"))) {
    res.status(400).json({ error: "Upload a preview clip for this workshop using the video uploader" }); return;
  }
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  const teaser = parsed.data.previewVideoUrl === undefined ? workshop.previewVideoUrl : parsed.data.previewVideoUrl;
  const published = parsed.data.isPublished ?? workshop.isPublished;
  const modules = await db.select({ previewVideoUrl: workshopModulesTable.previewVideoUrl })
    .from(workshopModulesTable).where(eq(workshopModulesTable.workshopId, workshopId));
  if (published && !teaser && !modules.some((module) => module.previewVideoUrl)) {
    res.status(400).json({ error: "Upload a workshop or module teaser before publishing" }); return;
  }
  if (!Object.keys(parsed.data).length) { res.status(400).json({ error: "No workshop changes supplied" }); return; }
  const [updated] = await db.update(workshopsTable).set(parsed.data).where(eq(workshopsTable.id, workshopId)).returning();
  res.json(UpdateInstructorWorkshopResponse.parse({ ...updated, tier: updated.tier === "academy" ? "workshop" : updated.tier, isEnrolled: false }));
});

router.patch("/instructor/workshops/:workshopId/modules/:moduleId", ...staff, async (req, res) => {
  const parsed = UpdateWorkshopModuleBody.safeParse(req.body);
  const workshopId = Number(req.params.workshopId), moduleId = Number(req.params.moduleId);
  if (!parsed.success || !Number.isSafeInteger(moduleId) || moduleId < 1) {
    res.status(400).json({ error: "Invalid module changes" }); return;
  }
  const [module] = await db.select().from(workshopModulesTable).where(and(
    eq(workshopModulesTable.id, moduleId), eq(workshopModulesTable.workshopId, workshopId),
  ));
  if (!module) { res.status(404).json({ error: "Module not found in this workshop" }); return; }
  if (!(await isValidWorkshopMediaReference(parsed.data.videoUrl, workshopId, "lesson")) ||
      !(await isValidWorkshopMediaReference(parsed.data.previewVideoUrl, workshopId, "preview"))) {
    res.status(400).json({ error: "Use separate, validated uploads from this workshop for preview and full lesson videos" }); return;
  }
  if (!Object.keys(parsed.data).length) { res.status(400).json({ error: "No module changes supplied" }); return; }
  const [updated] = await db.update(workshopModulesTable).set(parsed.data).where(eq(workshopModulesTable.id, moduleId)).returning();
  // Removing the final teaser also removes the workshop from the public catalog.
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  const previews = await db.select({ preview: workshopModulesTable.previewVideoUrl })
    .from(workshopModulesTable).where(eq(workshopModulesTable.workshopId, workshopId));
  if (workshop.isPublished && !workshop.previewVideoUrl && !previews.some((row) => row.preview)) {
    await db.update(workshopsTable).set({ isPublished: false }).where(eq(workshopsTable.id, workshopId));
  }
  res.json(UpdateWorkshopModuleResponse.parse(updated));
});

router.get("/instructor/workshops/:workshopId/participants", ...staff, async (req, res) => {
  const rows = await db.select({
    userId: usersTable.id, username: usersTable.username, status: enrollmentsTable.status,
  }).from(enrollmentsTable).innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.userId))
    .where(and(eq(enrollmentsTable.workshopId, Number(req.params.workshopId)), eq(enrollmentsTable.accessSource, "participant")));
  res.json(ListWorkshopParticipantsResponse.parse(rows));
});

router.post("/instructor/workshops/:workshopId/participants", ...staff, async (req, res) => {
  const parsed = EnrollWorkshopParticipantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(sql`lower(${usersTable.username}) = lower(${parsed.data.username.trim()})`);
  if (!user) { res.status(404).json({ error: "No creator found with that exact username" }); return; }
  const workshopId = Number(req.params.workshopId);
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  const enrollment = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${workshopId}, ${user.id})`);
    const [existing] = await tx.select().from(enrollmentsTable).where(and(
      eq(enrollmentsTable.workshopId, workshopId), eq(enrollmentsTable.userId, user.id),
    ));
    if (existing) {
      const [updated] = await tx.update(enrollmentsTable).set({ status: parsed.data.status, accessSource: "participant" })
        .where(and(eq(enrollmentsTable.workshopId, workshopId), eq(enrollmentsTable.userId, user.id))).returning();
      return updated;
    }
    if (parsed.data.status === "paused") return null;
    const [created] = await tx.insert(enrollmentsTable).values({
      workshopId, userId: user.id, status: "active", accessSource: "participant",
    }).returning();
    await tx.update(workshopsTable).set({ enrolledCount: sql`${workshopsTable.enrolledCount} + 1` }).where(eq(workshopsTable.id, workshopId));
    return created;
  });
  if (!enrollment) { res.status(404).json({ error: "This creator is not enrolled in the workshop" }); return; }
  res.json(EnrollWorkshopParticipantResponse.parse({
    ...enrollment, workshopTitle: workshop.title, workshopThumbnailUrl: workshop.thumbnailUrl,
    totalModules: workshop.totalModules,
    progressPercent: workshop.totalModules > 0 ? enrollment.completedModules / workshop.totalModules * 100 : 0,
  }));
});

router.post("/workshops/:id/modules/:moduleId/playback", async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Sign in to watch full lessons" }); return; }
  const parsed = CreateWorkshopLessonPlaybackParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid workshop or module" }); return; }
  const [module] = await db.select().from(workshopModulesTable).where(and(
    eq(workshopModulesTable.id, parsed.data.moduleId), eq(workshopModulesTable.workshopId, parsed.data.id),
  ));
  if (!module) { res.status(404).json({ error: "Lesson not found" }); return; }
  const access = await getWorkshopLessonAccess(req.dbUser.id, parsed.data.id);
  if (access.accessStatus === "unavailable") {
    res.status(503).json({ error: "membership_check_unavailable", message: "Unable to verify lesson access. Please retry." }); return;
  }
  if (!access.hasFullAccess) {
    res.status(403).json({ error: "lesson_access_required", requiredTier: "academy", message: "Full lessons require an active $39 Dedicated Artist subscription or enrollment in this workshop." }); return;
  }
  const [workshop] = await db.select({ isPublished: workshopsTable.isPublished }).from(workshopsTable).where(eq(workshopsTable.id, parsed.data.id));
  if (!workshop.isPublished && !access.isStaff && !access.hasParticipantAccess) {
    res.status(404).json({ error: "Lesson not found" }); return;
  }
  const path = workshopMediaObjectPath(module.videoUrl);
  if (!path) {
    res.status(404).json({ error: "This full lesson has not been uploaded to protected storage yet" }); return;
  }
  try {
    const playbackUrl = await storage.getWorkshopVideoPlaybackURL(path, PLAYBACK_TTL);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(CreateWorkshopLessonPlaybackResponse.parse({ playbackUrl, expiresAt: new Date(Date.now() + PLAYBACK_TTL * 1000).toISOString() }));
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Lesson video is unavailable. Contact the instructor." }); return; }
    throw error;
  }
});

export default router;

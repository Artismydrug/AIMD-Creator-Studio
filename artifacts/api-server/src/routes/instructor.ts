import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import {
  db,
  instructorProfilesTable,
  workshopInstructorsTable,
  workshopsTable,
  workshopModulesTable,
  drillPromptsTable,
  assignmentsTable,
  assignmentExtensionsTable,
  userRolesTable,
  usersTable,
} from "@workspace/db";
import {
  GetInstructorSelfResponse,
  UpdateInstructorSelfBody,
  UpdateInstructorSelfResponse,
  GetInstructorCurriculumResponse,
  CreateWorkshopModuleParams,
  CreateWorkshopModuleBody,
  CreateWorkshopModuleResponse,
  CreateDrillPromptParams,
  CreateDrillPromptBody,
  CreateDrillPromptResponse,
  ListSubmissionQueueQueryParams,
  ListSubmissionQueueResponse,
  SubmitAssignmentFeedbackParams,
  SubmitAssignmentFeedbackBody,
  SubmitAssignmentFeedbackResponse,
  ListInstructorsResponse,
  CreateInstructorBody,
  CreateInstructorResponse,
  LinkInstructorUserParams,
  LinkInstructorUserBody,
  LinkInstructorUserResponse,
  AssignInstructorToWorkshopParams,
  AssignInstructorToWorkshopBody,
  AssignInstructorToWorkshopResponse,
} from "@workspace/api-zod";
import { requireInstructor } from "../middlewares/requireInstructor";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ── Instructor self-service ────────────────────────────────────────────────────

/** GET /instructor/me */
router.get("/instructor/me", requireInstructor, async (req, res): Promise<void> => {
  const profile = req.instructorProfile;
  if (!profile) {
    res.status(404).json({ error: "Instructor profile not found" });
    return;
  }
  res.json(GetInstructorSelfResponse.parse(profile));
});

/** PATCH /instructor/me */
router.patch("/instructor/me", requireInstructor, async (req, res): Promise<void> => {
  const profile = req.instructorProfile;
  if (!profile) {
    res.status(404).json({ error: "Instructor profile not found" });
    return;
  }

  const parsed = UpdateInstructorSelfBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.specialties !== undefined) updates.specialties = parsed.data.specialties;

  const [updated] = await db
    .update(instructorProfilesTable)
    .set(updates)
    .where(eq(instructorProfilesTable.id, profile.id))
    .returning();

  res.json(UpdateInstructorSelfResponse.parse(updated));
});

// ── Assigned curriculum ────────────────────────────────────────────────────────

/** GET /instructor/curriculum */
router.get("/instructor/curriculum", requireInstructor, async (req, res): Promise<void> => {
  const profile = req.instructorProfile!;

  // If admin without a profile, return all workshops
  const isAdmin = req.dbUser?.isAdmin;

  let assignments: { workshopId: number }[];
  if (isAdmin) {
    const allWorkshops = await db.select({ id: workshopsTable.id }).from(workshopsTable);
    assignments = allWorkshops.map((w) => ({ workshopId: w.id }));
  } else {
    assignments = await db
      .select({ workshopId: workshopInstructorsTable.workshopId })
      .from(workshopInstructorsTable)
      .where(eq(workshopInstructorsTable.instructorId, profile.id));
  }

  const result = await Promise.all(
    assignments.map(async ({ workshopId }) => {
      const [workshop] = await db
        .select()
        .from(workshopsTable)
        .where(eq(workshopsTable.id, workshopId));
      if (!workshop) return null;

      const [moduleCountRow] = await db
        .select({ count: count() })
        .from(workshopModulesTable)
        .where(eq(workshopModulesTable.workshopId, workshopId));

      const [pendingRow] = await db
        .select({ count: count() })
        .from(assignmentsTable)
        .where(
          and(
            eq(assignmentsTable.workshopId, workshopId),
            eq(assignmentsTable.status, "pending"),
          ),
        );

      return {
        workshopId,
        workshopTitle: workshop.title,
        workshopTier: workshop.tier,
        moduleCount: moduleCountRow?.count ?? 0,
        pendingSubmissions: pendingRow?.count ?? 0,
      };
    }),
  );

  res.json(GetInstructorCurriculumResponse.parse(result.filter(Boolean)));
});

// ── Module & drill creation ────────────────────────────────────────────────────

/** POST /instructor/workshops/:workshopId/modules */
router.post(
  "/instructor/workshops/:workshopId/modules",
  requireInstructor,
  async (req, res): Promise<void> => {
    const profile = req.instructorProfile!;
    const isAdmin = req.dbUser?.isAdmin;

    const params = CreateWorkshopModuleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { workshopId } = params.data;

    // Check workshop exists
    const [workshop] = await db
      .select()
      .from(workshopsTable)
      .where(eq(workshopsTable.id, workshopId));
    if (!workshop) {
      res.status(404).json({ error: "Workshop not found" });
      return;
    }

    // Check instructor is assigned (admins skip)
    if (!isAdmin) {
      const [assignment] = await db
        .select()
        .from(workshopInstructorsTable)
        .where(
          and(
            eq(workshopInstructorsTable.workshopId, workshopId),
            eq(workshopInstructorsTable.instructorId, profile.id),
          ),
        );
      if (!assignment) {
        res.status(403).json({ error: "Not assigned to this workshop" });
        return;
      }
    }

    const body = CreateWorkshopModuleBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [created] = await db
      .insert(workshopModulesTable)
      .values({
        workshopId,
        title: body.data.title,
        description: body.data.description ?? null,
        videoUrl: body.data.videoUrl ?? null,
        order: body.data.order,
        durationMinutes: body.data.durationMinutes ?? 0,
      })
      .returning();

    // Update totalModules count
    await db
      .update(workshopsTable)
      .set({ totalModules: workshop.totalModules + 1 })
      .where(eq(workshopsTable.id, workshopId));

    res.status(201).json(CreateWorkshopModuleResponse.parse(created));
  },
);

/** POST /instructor/workshops/:workshopId/modules/:moduleId/drills */
router.post(
  "/instructor/workshops/:workshopId/modules/:moduleId/drills",
  requireInstructor,
  async (req, res): Promise<void> => {
    const profile = req.instructorProfile!;
    const isAdmin = req.dbUser?.isAdmin;

    const params = CreateDrillPromptParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { workshopId, moduleId } = params.data;

    // Check instructor is assigned (admins skip)
    if (!isAdmin) {
      const [assignment] = await db
        .select()
        .from(workshopInstructorsTable)
        .where(
          and(
            eq(workshopInstructorsTable.workshopId, workshopId),
            eq(workshopInstructorsTable.instructorId, profile.id),
          ),
        );
      if (!assignment) {
        res.status(403).json({ error: "Not assigned to this workshop" });
        return;
      }
    }

    // The module must belong to the workshop the instructor is assigned to —
    // otherwise an instructor assigned to workshop A could create drills in
    // any other workshop's modules by passing A's id in the URL.
    const [module] = await db
      .select({ id: workshopModulesTable.id })
      .from(workshopModulesTable)
      .where(
        and(
          eq(workshopModulesTable.id, moduleId),
          eq(workshopModulesTable.workshopId, workshopId),
        ),
      );
    if (!module) {
      res.status(404).json({ error: "Module does not belong to this workshop" });
      return;
    }

    const body = CreateDrillPromptBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    // Server-side enforcement: 30-second max
    const maxDuration = body.data.maxDurationSeconds ?? 30;
    if (maxDuration > 30) {
      res.status(400).json({
        error: "maxDurationSeconds cannot exceed 30 seconds",
        maxAllowed: 30,
      });
      return;
    }

    const [created] = await db
      .insert(drillPromptsTable)
      .values({
        moduleId,
        prompt: body.data.prompt,
        maxDurationSeconds: maxDuration,
        createdBy: profile?.id ?? null,
      })
      .returning();

    res.status(201).json(CreateDrillPromptResponse.parse(created));
  },
);

// ── Submission queue & feedback ────────────────────────────────────────────────

/** GET /instructor/submissions */
router.get("/instructor/submissions", requireInstructor, async (req, res): Promise<void> => {
  const profile = req.instructorProfile!;
  const isAdmin = req.dbUser?.isAdmin;

  const query = ListSubmissionQueueQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  // Determine which workshop IDs this instructor can see
  let allowedWorkshopIds: number[] | null = null;
  if (!isAdmin) {
    const rows = await db
      .select({ workshopId: workshopInstructorsTable.workshopId })
      .from(workshopInstructorsTable)
      .where(eq(workshopInstructorsTable.instructorId, profile.id));
    allowedWorkshopIds = rows.map((r) => r.workshopId);
  }

  // Fetch assignments
  let assignments = await db.select().from(assignmentsTable);

  if (allowedWorkshopIds !== null) {
    assignments = assignments.filter((a) =>
      allowedWorkshopIds!.includes(a.workshopId),
    );
  }
  if (query.data.workshopId) {
    assignments = assignments.filter((a) => a.workshopId === query.data.workshopId);
  }
  if (query.data.status) {
    assignments = assignments.filter((a) => a.status === query.data.status);
  }

  // Merge with extensions
  const results = await Promise.all(
    assignments.map(async (a) => {
      const [ext] = await db
        .select()
        .from(assignmentExtensionsTable)
        .where(eq(assignmentExtensionsTable.assignmentId, a.id));

      const [workshop] = await db
        .select({ title: workshopsTable.title })
        .from(workshopsTable)
        .where(eq(workshopsTable.id, a.workshopId));

      return {
        ...a,
        workshopTitle: workshop?.title ?? null,
        captureSource: ext?.captureSource ?? null,
        measuredDurationSeconds: ext?.measuredDurationSeconds ?? null,
        feedbackText: ext?.feedbackText ?? a.feedback ?? null,
        feedbackAudioUrl: ext?.feedbackAudioUrl ?? null,
        feedbackVideoUrl: ext?.feedbackVideoUrl ?? null,
        reviewedBy: ext?.reviewedBy ?? null,
        reviewedAt: ext?.reviewedAt ?? null,
      };
    }),
  );

  res.json(ListSubmissionQueueResponse.parse(results));
});

/** POST /instructor/submissions/:assignmentId/feedback */
router.post(
  "/instructor/submissions/:assignmentId/feedback",
  requireInstructor,
  async (req, res): Promise<void> => {
    const profile = req.instructorProfile!;
    const isAdmin = req.dbUser?.isAdmin;

    const params = SubmitAssignmentFeedbackParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    // Check instructor owns the workshop (admins skip)
    if (!isAdmin) {
      const [assignment2] = await db
        .select()
        .from(workshopInstructorsTable)
        .where(
          and(
            eq(workshopInstructorsTable.workshopId, assignment.workshopId),
            eq(workshopInstructorsTable.instructorId, profile.id),
          ),
        );
      if (!assignment2) {
        res.status(403).json({ error: "Not assigned to this workshop" });
        return;
      }
    }

    const body = SubmitAssignmentFeedbackBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const reviewerUserId = req.dbUser!.id;
    const now = new Date();

    // Update main assignment
    await db
      .update(assignmentsTable)
      .set({
        status: body.data.status,
        feedback: body.data.feedbackText ?? assignment.feedback,
        grade: body.data.grade ?? assignment.grade,
      })
      .where(eq(assignmentsTable.id, assignment.id));

    // Upsert extension
    const existing = await db
      .select()
      .from(assignmentExtensionsTable)
      .where(eq(assignmentExtensionsTable.assignmentId, assignment.id));

    if (existing.length > 0) {
      await db
        .update(assignmentExtensionsTable)
        .set({
          feedbackText: body.data.feedbackText ?? existing[0].feedbackText,
          feedbackAudioUrl:
            body.data.feedbackAudioUrl ?? existing[0].feedbackAudioUrl,
          feedbackVideoUrl:
            body.data.feedbackVideoUrl ?? existing[0].feedbackVideoUrl,
          reviewedBy: reviewerUserId,
          reviewedAt: now,
        })
        .where(eq(assignmentExtensionsTable.assignmentId, assignment.id));
    } else {
      await db.insert(assignmentExtensionsTable).values({
        assignmentId: assignment.id,
        feedbackText: body.data.feedbackText ?? null,
        feedbackAudioUrl: body.data.feedbackAudioUrl ?? null,
        feedbackVideoUrl: body.data.feedbackVideoUrl ?? null,
        reviewedBy: reviewerUserId,
        reviewedAt: now,
      });
    }

    // Return updated view
    const [updatedAssignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignment.id));
    const [ext] = await db
      .select()
      .from(assignmentExtensionsTable)
      .where(eq(assignmentExtensionsTable.assignmentId, assignment.id));
    const [workshop] = await db
      .select({ title: workshopsTable.title })
      .from(workshopsTable)
      .where(eq(workshopsTable.id, assignment.workshopId));

    res.json(
      SubmitAssignmentFeedbackResponse.parse({
        ...updatedAssignment,
        workshopTitle: workshop?.title ?? null,
        captureSource: ext?.captureSource ?? null,
        measuredDurationSeconds: ext?.measuredDurationSeconds ?? null,
        feedbackText: ext?.feedbackText ?? updatedAssignment.feedback ?? null,
        feedbackAudioUrl: ext?.feedbackAudioUrl ?? null,
        feedbackVideoUrl: ext?.feedbackVideoUrl ?? null,
        reviewedBy: ext?.reviewedBy ?? null,
        reviewedAt: ext?.reviewedAt ?? null,
      }),
    );
  },
);

// ── Admin endpoints ────────────────────────────────────────────────────────────

/** GET /admin/instructors */
router.get("/admin/instructors", requireAdmin, async (_req, res): Promise<void> => {
  const profiles = await db.select().from(instructorProfilesTable);
  res.json(ListInstructorsResponse.parse(profiles));
});

/** POST /admin/instructors */
router.post("/admin/instructors", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateInstructorBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Check slug uniqueness
  const [existing] = await db
    .select({ id: instructorProfilesTable.id })
    .from(instructorProfilesTable)
    .where(eq(instructorProfilesTable.mentorSlug, body.data.mentorSlug));
  if (existing) {
    res.status(409).json({ error: "mentorSlug already in use" });
    return;
  }

  const [created] = await db
    .insert(instructorProfilesTable)
    .values({
      displayName: body.data.displayName,
      bio: body.data.bio ?? null,
      avatarUrl: body.data.avatarUrl ?? null,
      mentorSlug: body.data.mentorSlug,
      verified: body.data.verified ?? false,
      specialties: body.data.specialties ?? null,
    })
    .returning();

  res.status(201).json(CreateInstructorResponse.parse(created));
});

/** POST /admin/instructors/:instructorId/link-user */
router.post(
  "/admin/instructors/:instructorId/link-user",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = LinkInstructorUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = LinkInstructorUserBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [profile] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.id, params.data.instructorId));
    if (!profile) {
      res.status(404).json({ error: "Instructor profile not found" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, body.data.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check the target user is not already linked to a different instructor
    const [conflicting] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.userId, body.data.userId));
    if (conflicting && conflicting.id !== params.data.instructorId) {
      res
        .status(400)
        .json({ error: "User already linked to a different instructor profile" });
      return;
    }

    // Link the user
    const [updated] = await db
      .update(instructorProfilesTable)
      .set({ userId: body.data.userId, updatedAt: new Date() })
      .where(eq(instructorProfilesTable.id, params.data.instructorId))
      .returning();

    // Upsert role as instructor
    await db
      .insert(userRolesTable)
      .values({ userId: body.data.userId, role: "instructor" })
      .onConflictDoUpdate({
        target: userRolesTable.userId,
        set: { role: "instructor" },
      });

    res.json(LinkInstructorUserResponse.parse(updated));
  },
);

/** POST /admin/instructors/:instructorId/assign-workshop */
router.post(
  "/admin/instructors/:instructorId/assign-workshop",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = AssignInstructorToWorkshopParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = AssignInstructorToWorkshopBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [profile] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.id, params.data.instructorId));
    if (!profile) {
      res.status(404).json({ error: "Instructor profile not found" });
      return;
    }

    const [workshop] = await db
      .select()
      .from(workshopsTable)
      .where(eq(workshopsTable.id, body.data.workshopId));
    if (!workshop) {
      res.status(404).json({ error: "Workshop not found" });
      return;
    }

    // Check already assigned
    const [existing] = await db
      .select()
      .from(workshopInstructorsTable)
      .where(
        and(
          eq(workshopInstructorsTable.workshopId, body.data.workshopId),
          eq(workshopInstructorsTable.instructorId, params.data.instructorId),
        ),
      );
    if (existing) {
      res.status(409).json({ error: "Instructor already assigned to this workshop" });
      return;
    }

    const [created] = await db
      .insert(workshopInstructorsTable)
      .values({
        workshopId: body.data.workshopId,
        instructorId: params.data.instructorId,
      })
      .returning();

    res.status(201).json(AssignInstructorToWorkshopResponse.parse(created));
  },
);

export default router;

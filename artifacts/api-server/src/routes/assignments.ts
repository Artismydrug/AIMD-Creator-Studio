import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, assignmentsTable, workshopsTable } from "@workspace/db";
import {
  ListAssignmentsResponse,
  SubmitAssignmentBody,
  SubmitAssignmentResponse,
  GetAssignmentParams,
  GetAssignmentResponse,
} from "@workspace/api-zod";
import { requireTier } from "../middleware/requireTier";

const router: IRouter = Router();

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
  const [assignment] = await db
    .insert(assignmentsTable)
    .values({ ...parsed.data, userId, status: "pending" })
    .returning();

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, parsed.data.workshopId));
  res.status(201).json(
    SubmitAssignmentResponse.parse({
      ...assignment,
      workshopTitle: workshop?.title ?? null,
    })
  );
});

router.get("/assignments/:id", async (req, res): Promise<void> => {
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
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, assignment.workshopId));
  res.json(GetAssignmentResponse.parse({ ...assignment, workshopTitle: workshop?.title ?? null }));
});

export default router;

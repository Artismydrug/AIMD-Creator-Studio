import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, jobListingsTable, jobApplicationsTable, usersTable } from "@workspace/db";
import {
  ListJobListingsQueryParams,
  ListJobListingsResponse,
  GetJobListingParams,
  GetJobListingResponse,
  ApplyForJobParams,
  ApplyForJobBody,
  ApplyForJobResponse,
  ListApplicationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CURRENT_USER_ID = 1;

router.get("/job-listings", async (req, res): Promise<void> => {
  const parsed = ListJobListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let listings = await db.select().from(jobListingsTable).orderBy(desc(jobListingsTable.createdAt));

  if (parsed.data.type) {
    listings = listings.filter((l) => l.type === parsed.data.type);
  }
  if (parsed.data.open !== undefined && parsed.data.open !== null) {
    listings = listings.filter((l) => l.isOpen === parsed.data.open);
  }

  const applications = await db
    .select()
    .from(jobApplicationsTable)
    .where(eq(jobApplicationsTable.userId, CURRENT_USER_ID));
  const appliedSet = new Set(applications.map((a) => a.jobListingId));

  const result = listings.map((l) => ({ ...l, hasApplied: appliedSet.has(l.id) }));
  res.json(ListJobListingsResponse.parse(result));
});

router.get("/job-listings/:id", async (req, res): Promise<void> => {
  const params = GetJobListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [listing] = await db.select().from(jobListingsTable).where(eq(jobListingsTable.id, params.data.id));
  if (!listing) {
    res.status(404).json({ error: "Job listing not found" });
    return;
  }
  const [application] = await db
    .select()
    .from(jobApplicationsTable)
    .where(and(eq(jobApplicationsTable.jobListingId, listing.id), eq(jobApplicationsTable.userId, CURRENT_USER_ID)));

  res.json(GetJobListingResponse.parse({ ...listing, hasApplied: !!application }));
});

router.post("/job-listings/:id/apply", async (req, res): Promise<void> => {
  const params = ApplyForJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ApplyForJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db.select().from(jobListingsTable).where(eq(jobListingsTable.id, params.data.id));
  if (!listing) {
    res.status(404).json({ error: "Job listing not found" });
    return;
  }
  if (!listing.isOpen) {
    res.status(400).json({ error: "This position is no longer open" });
    return;
  }

  const [application] = await db
    .insert(jobApplicationsTable)
    .values({
      userId: CURRENT_USER_ID,
      jobListingId: params.data.id,
      coverLetter: parsed.data.coverLetter ?? null,
      status: "pending",
    })
    .returning();

  await db
    .update(jobListingsTable)
    .set({ applicantCount: listing.applicantCount + 1 })
    .where(eq(jobListingsTable.id, params.data.id));

  res.status(201).json(
    ApplyForJobResponse.parse({
      ...application,
      jobTitle: listing.title,
      studioName: listing.studioName,
    })
  );
});

router.get("/applications", async (req, res): Promise<void> => {
  const applications = await db
    .select()
    .from(jobApplicationsTable)
    .where(eq(jobApplicationsTable.userId, CURRENT_USER_ID))
    .orderBy(desc(jobApplicationsTable.appliedAt));

  const listingIds = applications.map((a) => a.jobListingId);
  const listings = listingIds.length > 0 ? await db.select().from(jobListingsTable) : [];
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  const result = applications.map((a) => {
    const listing = listingMap.get(a.jobListingId);
    return {
      ...a,
      jobTitle: listing?.title ?? "",
      studioName: listing?.studioName ?? "",
    };
  });
  res.json(ListApplicationsResponse.parse(result));
});

export default router;

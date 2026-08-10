import { Router, type IRouter } from "express";
import { eq, and, desc, asc } from "drizzle-orm";
import { db, skillTracksTable, skillMilestonesTable } from "@workspace/db";
import {
  ListSkillTracksResponse,
  CreateSkillTrackBody,
  CreateSkillTrackResponse,
  UpdateSkillTrackParams,
  UpdateSkillTrackBody,
  UpdateSkillTrackResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CURRENT_USER_ID = 1;

const ART_FORM_MILESTONES: Record<string, string[]> = {
  "Tattooing": [
    "Complete Basic Line Work Workshop",
    "Master Shading Techniques",
    "Complete Color Theory Module",
    "Submit 3 Client-Ready Designs",
    "Pass Portfolio Review",
  ],
  "Fine Art": [
    "Complete Drawing Fundamentals",
    "Master Oil Painting Basics",
    "Study Composition & Color",
    "Complete 5 Original Works",
    "Gallery Submission Ready",
  ],
  "Spatial Design": [
    "3D Modeling Fundamentals",
    "Interior Design Principles",
    "Material & Texture Studies",
    "Complete Full Room Concept",
    "Client Presentation Ready",
  ],
  "Illustration": [
    "Digital Tools Mastery",
    "Character Design Basics",
    "Background & Environment Art",
    "Complete Portfolio Pieces",
    "Client Brief Submission",
  ],
  "Photography": [
    "Camera & Lighting Basics",
    "Composition Techniques",
    "Photo Editing & Retouching",
    "Complete Photo Series",
    "Portfolio Presentation",
  ],
};

const DEFAULT_MILESTONES = [
  "Complete Introductory Workshop",
  "Master Core Techniques",
  "Advanced Studies",
  "Portfolio Development",
  "Certification Review",
];

async function getTrackWithMilestones(trackId: number) {
  const [track] = await db.select().from(skillTracksTable).where(eq(skillTracksTable.id, trackId));
  if (!track) return null;
  const milestones = await db
    .select()
    .from(skillMilestonesTable)
    .where(eq(skillMilestonesTable.skillTrackId, trackId))
    .orderBy(asc(skillMilestonesTable.order));
  return { ...track, milestones };
}

router.get("/skill-tracks", async (req, res): Promise<void> => {
  const tracks = await db
    .select()
    .from(skillTracksTable)
    .where(eq(skillTracksTable.userId, CURRENT_USER_ID))
    .orderBy(desc(skillTracksTable.createdAt));

  const result = await Promise.all(tracks.map((t) => getTrackWithMilestones(t.id)));
  res.json(ListSkillTracksResponse.parse(result.filter(Boolean)));
});

router.post("/skill-tracks", async (req, res): Promise<void> => {
  const parsed = CreateSkillTrackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const milestoneLabels = ART_FORM_MILESTONES[parsed.data.artForm] ?? DEFAULT_MILESTONES;
  const totalMilestones = milestoneLabels.length;

  const [track] = await db
    .insert(skillTracksTable)
    .values({
      userId: CURRENT_USER_ID,
      artForm: parsed.data.artForm,
      totalMilestones,
      completedMilestones: 0,
      percentComplete: 0,
      status: "in_progress",
    })
    .returning();

  await db.insert(skillMilestonesTable).values(
    milestoneLabels.map((label, idx) => ({
      skillTrackId: track.id,
      label,
      completed: false,
      order: idx,
    }))
  );

  const full = await getTrackWithMilestones(track.id);
  res.status(201).json(CreateSkillTrackResponse.parse(full));
});

router.patch("/skill-tracks/:id", async (req, res): Promise<void> => {
  const params = UpdateSkillTrackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSkillTrackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [track] = await db
    .select()
    .from(skillTracksTable)
    .where(and(eq(skillTracksTable.id, params.data.id), eq(skillTracksTable.userId, CURRENT_USER_ID)));
  if (!track) {
    res.status(404).json({ error: "Skill track not found" });
    return;
  }

  const completedMilestones = parsed.data.completedMilestones ?? track.completedMilestones;
  const totalMilestones = track.totalMilestones;
  const percentComplete = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  const status = parsed.data.status ?? (completedMilestones >= totalMilestones ? "certified" : track.status);

  // Update milestone completion states
  if (parsed.data.completedMilestones !== undefined) {
    const milestones = await db
      .select()
      .from(skillMilestonesTable)
      .where(eq(skillMilestonesTable.skillTrackId, track.id))
      .orderBy(asc(skillMilestonesTable.order));

    for (let i = 0; i < milestones.length; i++) {
      await db
        .update(skillMilestonesTable)
        .set({ completed: i < completedMilestones })
        .where(eq(skillMilestonesTable.id, milestones[i].id));
    }
  }

  const [updated] = await db
    .update(skillTracksTable)
    .set({ completedMilestones, percentComplete, status })
    .where(eq(skillTracksTable.id, track.id))
    .returning();

  const full = await getTrackWithMilestones(updated.id);
  res.json(UpdateSkillTrackResponse.parse(full));
});

export default router;

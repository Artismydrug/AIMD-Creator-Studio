import { Router } from "express";
import { db } from "@workspace/db";
import { communityEventsTable, eventRsvpsTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  ListEventsQueryParams,
  CreateEventBody,
  GetEventParams,
  RsvpToEventParams,
} from "@workspace/api-zod";

const router = Router();
const CURRENT_USER_ID = 1;

// GET /events
router.get("/", async (req, res) => {
  try {
    const query = ListEventsQueryParams.parse(req.query);

    let conditions = [];
    if (query.upcoming === true) {
      conditions.push(gte(communityEventsTable.startsAt, new Date()));
    }
    if (query.category) {
      conditions.push(eq(communityEventsTable.category, query.category));
    }

    const events = await db
      .select()
      .from(communityEventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(communityEventsTable.isFeatured), communityEventsTable.startsAt);

    // Get user RSVPs
    const rsvps = await db
      .select({ eventId: eventRsvpsTable.eventId })
      .from(eventRsvpsTable)
      .where(eq(eventRsvpsTable.userId, CURRENT_USER_ID));

    const rsvpSet = new Set(rsvps.map((r) => r.eventId));

    const result = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      eventType: e.eventType,
      location: e.location,
      imageUrl: e.imageUrl,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      rsvpCount: e.rsvpCount,
      hasRsvped: rsvpSet.has(e.id),
      maxCapacity: e.maxCapacity,
      isFeatured: e.isFeatured,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// POST /events
router.post("/", async (req, res) => {
  try {
    const body = CreateEventBody.parse(req.body);
    const [event] = await db
      .insert(communityEventsTable)
      .values({
        title: body.title,
        description: body.description,
        category: body.category,
        eventType: body.eventType,
        location: body.location,
        imageUrl: body.imageUrl ?? null,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        maxCapacity: body.maxCapacity ?? null,
        isFeatured: body.isFeatured ?? false,
      })
      .returning();

    res.status(201).json({
      ...event,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      hasRsvped: false,
      createdAt: event.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /events/my-rsvps  — must be before /:id
router.get("/my-rsvps", async (req, res) => {
  try {
    const rsvps = await db
      .select({ eventId: eventRsvpsTable.eventId })
      .from(eventRsvpsTable)
      .where(eq(eventRsvpsTable.userId, CURRENT_USER_ID));

    const eventIds = rsvps.map((r) => r.eventId);
    if (eventIds.length === 0) return res.json([]);

    const events = await db
      .select()
      .from(communityEventsTable)
      .where(sql`${communityEventsTable.id} = ANY(${eventIds})`)
      .orderBy(communityEventsTable.startsAt);

    const result = events.map((e) => ({
      ...e,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      hasRsvped: true,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /events/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = GetEventParams.parse({ id: Number(req.params.id) });
    const [event] = await db
      .select()
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, id));

    if (!event) return res.status(404).json({ error: "Event not found" });

    const [rsvp] = await db
      .select()
      .from(eventRsvpsTable)
      .where(
        and(
          eq(eventRsvpsTable.eventId, id),
          eq(eventRsvpsTable.userId, CURRENT_USER_ID)
        )
      );

    res.json({
      ...event,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      hasRsvped: !!rsvp,
      createdAt: event.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// POST /events/:id/rsvp — toggle
router.post("/:id/rsvp", async (req, res) => {
  try {
    const { id } = RsvpToEventParams.parse({ id: Number(req.params.id) });

    const [event] = await db
      .select()
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, id));

    if (!event) return res.status(404).json({ error: "Event not found" });

    const [existing] = await db
      .select()
      .from(eventRsvpsTable)
      .where(
        and(
          eq(eventRsvpsTable.eventId, id),
          eq(eventRsvpsTable.userId, CURRENT_USER_ID)
        )
      );

    let hasRsvped: boolean;
    if (existing) {
      await db
        .delete(eventRsvpsTable)
        .where(eq(eventRsvpsTable.id, existing.id));
      await db
        .update(communityEventsTable)
        .set({ rsvpCount: Math.max(0, event.rsvpCount - 1) })
        .where(eq(communityEventsTable.id, id));
      hasRsvped = false;
    } else {
      await db
        .insert(eventRsvpsTable)
        .values({ userId: CURRENT_USER_ID, eventId: id });
      await db
        .update(communityEventsTable)
        .set({ rsvpCount: event.rsvpCount + 1 })
        .where(eq(communityEventsTable.id, id));
      hasRsvped = true;
    }

    const [updated] = await db
      .select()
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, id));

    res.json({
      ...updated,
      startsAt: updated!.startsAt.toISOString(),
      endsAt: updated!.endsAt ? updated!.endsAt.toISOString() : null,
      hasRsvped,
      createdAt: updated!.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;

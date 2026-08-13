import { Router } from "express";
import { db } from "@workspace/db";
import { communityEventsTable, eventRsvpsTable, eventAttendancesTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  ListEventsQueryParams,
  CreateEventBody,
  GetEventParams,
  RsvpToEventParams,
} from "@workspace/api-zod";
import { generateToken, verifyToken, TOKEN_TTL_HOURS, isValidOrganizerKey } from "../lib/eventQrToken";

const router = Router();

// GET /events
router.get("/", async (req, res): Promise<void> => {
  try {
    const query = ListEventsQueryParams.parse(req.query);

    const conditions = [];
    if (query.upcoming === true) {
      conditions.push(gte(communityEventsTable.startsAt, new Date()));
    }
    if (query.category) {
      // Cast is safe: ListEventsQueryParams validates the enum values
      conditions.push(
        eq(
          communityEventsTable.category,
          query.category as "workshop" | "pop-up" | "gallery" | "activation" | "community"
        )
      );
    }

    const events = await db
      .select()
      .from(communityEventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(communityEventsTable.isFeatured), communityEventsTable.startsAt);

    const rsvpSet = new Set<number>();
    if (req.isAuthenticated()) {
      const rsvps = await db
        .select({ eventId: eventRsvpsTable.eventId })
        .from(eventRsvpsTable)
        .where(eq(eventRsvpsTable.userId, req.user.id));
      rsvps.forEach((r) => rsvpSet.add(r.eventId));
    }

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
router.post("/", async (req, res): Promise<void> => {
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
router.get("/my-rsvps", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rsvps = await db
      .select({ eventId: eventRsvpsTable.eventId })
      .from(eventRsvpsTable)
      .where(eq(eventRsvpsTable.userId, req.user.id));

    const eventIds = rsvps.map((r) => r.eventId);
    if (eventIds.length === 0) {
      res.json([]);
      return;
    }

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

// POST /events/check-in — verifies a signed QR token and records attendance
// Must come before /:id routes to prevent "check-in" being parsed as an id.
// Authentication is required: only logged-in creators can record attendance.
router.post("/check-in", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized — sign in to check in to an event" });
    return;
  }

  try {
    const qrData = req.body?.qrData;
    if (typeof qrData !== "string" || !qrData.trim()) {
      res.status(400).json({ error: "qrData is required" });
      return;
    }

    const verify = verifyToken(qrData.trim());

    if (!verify.ok) {
      const messages: Record<typeof verify.reason, string> = {
        invalid_format: "QR code is not a valid AIMD event token",
        invalid_signature: "QR code signature is invalid — token may have been tampered with",
        expired: "This check-in token has expired — ask the organizer for a fresh QR code",
      };
      res.status(200).json({
        success: false,
        eventId: null,
        eventTitle: null,
        message: messages[verify.reason],
        alreadyCheckedIn: false,
      });
      return;
    }

    const { eventId } = verify;

    const [event] = await db
      .select()
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, eventId));

    if (!event) {
      res.status(404).json({
        success: false,
        eventId,
        eventTitle: null,
        message: "Event not found",
        alreadyCheckedIn: false,
      });
      return;
    }

    // Atomic insert — ON CONFLICT DO NOTHING means concurrent duplicate scans
    // both succeed without a race condition; inserted count tells us which case.
    const inserted = await db
      .insert(eventAttendancesTable)
      .values({ userId: req.user.id, eventId: event.id })
      .onConflictDoNothing({ target: [eventAttendancesTable.userId, eventAttendancesTable.eventId] })
      .returning({ id: eventAttendancesTable.id });

    const alreadyCheckedIn = inserted.length === 0;

    res.json({
      success: true,
      eventId: event.id,
      eventTitle: event.title,
      message: alreadyCheckedIn
        ? `Already checked in to "${event.title}"`
        : `Checked in to "${event.title}"`,
      alreadyCheckedIn,
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /events/:id
router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetEventParams.parse({ id: Number(req.params.id) });
    const [event] = await db
      .select()
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const [rsvp] = req.isAuthenticated()
      ? await db
          .select()
          .from(eventRsvpsTable)
          .where(and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, req.user.id)))
      : [undefined];

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
router.post("/:id/rsvp", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    const { id } = RsvpToEventParams.parse({ id: Number(req.params.id) });

    const [event] = await db
      .select()
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(eventRsvpsTable)
      .where(and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, userId)));

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
        .values({ userId, eventId: id });
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

// GET /events/:id/qr-token — generates a server-signed check-in token.
// RESTRICTED: requires X-Organizer-Key header (derived from SESSION_SECRET).
// Only event organizers should know this key; attendees cannot obtain one.
router.get("/:id/qr-token", async (req, res): Promise<void> => {
  // Enforce organizer authorization before any database work
  if (!isValidOrganizerKey(req.headers["x-organizer-key"] as string | undefined)) {
    res.status(403).json({
      error: "Forbidden — X-Organizer-Key header is required for QR token issuance",
    });
    return;
  }

  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid event id" });
      return;
    }

    const [event] = await db
      .select({
        id: communityEventsTable.id,
        title: communityEventsTable.title,
        startsAt: communityEventsTable.startsAt,
      })
      .from(communityEventsTable)
      .where(eq(communityEventsTable.id, id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const token = generateToken(event.id);
    const expiresAt = new Date(
      (Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600) * 1000
    ).toISOString();

    res.json({ token, expiresAt, eventId: event.id, eventTitle: event.title });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;

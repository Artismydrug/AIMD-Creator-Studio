import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import eventsRouter from "./events";

type TestUser = { id: number; email: string; username: string; is_admin: boolean };
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
let creator: TestUser;
let admin: TestUser;
let pendingEventId: number;

function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).dbUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin,
    };
    next();
  });
  app.use("/api/events", eventsRouter);
  return app;
}

const eventInput = (priceCents?: number) => ({
  title: "Ticketing guard test",
  description: "Test event",
  category: "community",
  eventType: "ticketed",
  ...(priceCents === undefined ? {} : { priceCents }),
  location: "Test venue",
  startsAt: "2030-01-01T18:00:00.000Z",
});

beforeAll(async () => {
  const { rows } = await pool.query<TestUser>(
    `INSERT INTO users (email, username, is_admin)
     VALUES ($1, $2, false), ($3, $4, true)
     RETURNING id, email, username, is_admin`,
    [
      `ticket_creator_${suffix}@example.test`,
      `ticket_creator_${suffix}`,
      `ticket_admin_${suffix}@example.test`,
      `ticket_admin_${suffix}`,
    ],
  );
  [creator, admin] = rows;

  const { rows: events } = await pool.query<{ id: number }>(
    `INSERT INTO community_events
      (title, description, category, event_type, price_cents, location, starts_at)
     VALUES ('Pending ticket event', 'Test event', 'community', 'ticketed', NULL, 'Test venue', '2030-01-01T18:00:00Z')
     RETURNING id`,
  );
  pendingEventId = events[0].id;
});

afterAll(async () => {
  if (pendingEventId) {
    await pool.query("DELETE FROM event_rsvps WHERE event_id = $1", [pendingEventId]);
    await pool.query("DELETE FROM community_events WHERE id = $1", [pendingEventId]);
  }
  if (creator?.id && admin?.id) {
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [creator.id, admin.id]);
  }
  await pool.end().catch(() => {});
});

describe("ticketed event price trust boundary", () => {
  it("rejects ticketed event creation when price is missing", async () => {
    const res = await request(appFor(admin))
      .post("/api/events")
      .send(eventInput());

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/require.*price/i);
  });

  it("rejects RSVPs to a price-pending event through the API", async () => {
    const res = await request(appFor(creator))
      .post(`/api/events/${pendingEventId}/rsvp`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/price.*announced|price.*accepted/i);

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM event_rsvps WHERE event_id = $1",
      [pendingEventId],
    );
    expect(rows[0].count).toBe(0);
  });
});
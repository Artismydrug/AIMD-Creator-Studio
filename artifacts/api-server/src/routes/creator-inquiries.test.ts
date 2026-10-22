import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";

const { adminEmail, creatorEmail } = vi.hoisted(() => ({
  adminEmail: vi.fn().mockResolvedValue(undefined),
  creatorEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/tattooBookingEmail", () => ({
  sendTattooBookingNotification: adminEmail,
  sendCreatorInquiryNotification: creatorEmail,
}));
vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: class {
    uploadObjectEntity = async () => "/objects/private-inquiry-test";
    getObjectEntityFile = async () => ({ name: "private-inquiry-test" });
    downloadObject = async () => new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { "Content-Type": "image/png" },
    });
  },
}));
vi.mock("../lib/sanitizeChallengeMedia", () => ({
  sanitizeChallengeMedia: async (buffer: Buffer, contentType: string) => ({
    buffer, contentType, sha256: "test-sha256",
  }),
}));

import tattooBookingsRouter from "./tattoo-bookings";
import notificationsRouter from "./notifications";

type TestUser = { id: number; email: string; username: string };
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const clientEmail = `inquiry-client-${suffix}@example.test`;
let creator: TestUser;
let other: TestUser;

function appFor(user?: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as any).dbUser = user;
    (req as any).log = { error: () => undefined, warn: () => undefined };
    next();
  });
  app.use("/api", tattooBookingsRouter);
  app.use("/api", notificationsRouter);
  return app;
}

beforeAll(async () => {
  const result = await pool.query<TestUser>(
    `INSERT INTO users (email, username, booking_open)
     VALUES ($1,$2,true),($3,$4,false) RETURNING id,email,username`,
    [`inquiry-creator-${suffix}@example.test`, `creator-${suffix}`,
      `inquiry-other-${suffix}@example.test`, `other-${suffix}`],
  );
  [creator, other] = result.rows;
});
beforeEach(() => {
  adminEmail.mockClear();
  creatorEmail.mockReset().mockResolvedValue(undefined);
});
afterAll(async () => {
  await pool.query("DELETE FROM tattoo_bookings WHERE email=$1", [clientEmail]);
  const ids = [creator?.id, other?.id].filter(Boolean);
  if (ids.length) await pool.query("DELETE FROM users WHERE id=ANY($1::int[])", [ids]);
});

async function draftFor(creatorUserId: number, label: string, requestType = "painting") {
  return request(appFor()).post("/api/tattoo-bookings")
    .set("User-Agent", `creator-inquiry-${suffix}-${label}`)
    .send({
      requestType,
      creatorUserId,
      name: "Client Example",
      email: clientEmail,
      phone: "555-0100",
      idea: "A colorful painting for a community space.",
      placement: "Canvas",
      estimatedSize: "24 x 36 inches",
      preferredArtist: "Untrusted client-supplied artist",
      website: "",
    });
}

describe("creator inquiry delivery", () => {
  it("does not accept inquiries for a closed or nonexistent creator", async () => {
    expect((await draftFor(other.id, "closed")).status).toBe(404);
    expect((await draftFor(2_000_000_000, "missing")).status).toBe(404);
  });

  it("atomically creates one recipient alert, emails the real creator, and protects details and images", async () => {
    const draft = await draftFor(creator.id, "success");
    expect(draft.status).toBe(201);
    const uploaded = await request(appFor())
      .post(`/api/tattoo-bookings/${draft.body.id}/references`)
      .set("Content-Type", "image/png")
      .set("X-Booking-Token", draft.body.uploadToken)
      .set("X-File-Name", "reference.png")
      .send(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(uploaded.status).toBe(201);

    const submits = await Promise.all([1, 2].map(() =>
      request(appFor()).post(`/api/tattoo-bookings/${draft.body.id}/submit`)
        .send({ uploadToken: draft.body.uploadToken })));
    expect(submits.map((item) => item.status)).toEqual([200, 200]);
    expect(creatorEmail).toHaveBeenCalledOnce();
    expect(creatorEmail).toHaveBeenCalledWith(
      expect.objectContaining({ preferredArtist: creator.username }),
      expect.objectContaining({ id: creator.id, email: creator.email }),
    );
    expect(adminEmail).toHaveBeenCalledOnce();

    const listed = await request(appFor(creator)).get("/api/notifications");
    expect(listed.status).toBe(200);
    const notification = listed.body.notifications.find((item: any) =>
      item.inquiryDestination?.bookingId === draft.body.id);
    expect(notification.inquirySummary).toBe("New Commission Inquiry: Client Example requested a Painting project");
    expect(listed.body.unreadCount).toBe(1);
    expect((await request(appFor(other)).get("/api/notifications")).body.notifications).toEqual([]);

    expect((await request(appFor()).get(`/api/creator-inquiries/${draft.body.id}`)).status).toBe(401);
    expect((await request(appFor(other)).get(`/api/creator-inquiries/${draft.body.id}`)).status).toBe(404);
    const detail = await request(appFor(creator)).get(`/api/creator-inquiries/${draft.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ email: clientEmail, idea: "A colorful painting for a community space." });
    expect(detail.body.references[0].url).toBe(`/api/creator-inquiries/${draft.body.id}/references/${uploaded.body.id}`);
    expect(JSON.stringify(detail.body)).not.toContain("/objects/");
    const imageUrl = detail.body.references[0].url;
    expect((await request(appFor()).get(imageUrl)).status).toBe(401);
    expect((await request(appFor(other)).get(imageUrl)).status).toBe(404);
    const image = await request(appFor(creator)).get(imageUrl);
    expect(image.status).toBe(200);
    expect(image.headers["cache-control"]).toBe("private, no-store");
    expect(image.headers["content-type"]).toMatch(/image\/png/);

    const marked = await request(appFor(creator)).patch(`/api/notifications/${notification.id}/read`);
    expect(marked.status).toBe(200);
    expect(marked.body.inquiryDestination.bookingId).toBe(draft.body.id);
    expect((await request(appFor(creator)).get("/api/notifications")).body.unreadCount).toBe(0);
  });

  it("keeps the submitted inquiry and inbox alert when creator email fails", async () => {
    creatorEmail.mockRejectedValueOnce(new Error("Email service unavailable"));
    const draft = await draftFor(creator.id, "email-failure");
    const result = await request(appFor())
      .post(`/api/tattoo-bookings/${draft.body.id}/submit`)
      .send({ uploadToken: draft.body.uploadToken });
    expect(result.status).toBe(200);
    const saved = await pool.query(
      "SELECT status,creator_notification_status FROM tattoo_bookings WHERE id=$1",
      [draft.body.id],
    );
    expect(saved.rows[0]).toEqual({ status: "new", creator_notification_status: "failed" });
    const listed = await request(appFor(creator)).get("/api/notifications");
    expect(listed.body.notifications.some((item: any) =>
      item.inquiryDestination?.bookingId === draft.body.id)).toBe(true);
  });

  it("accepts only the creator’s active custom services and preserves the service label", async () => {
    await pool.query("UPDATE users SET inquiry_options=$2 WHERE id=$1", [
      creator.id,
      ["Leather Work", "Mural"],
    ]);
    try {
      expect((await draftFor(creator.id, "not-active", "Painting")).status).toBe(400);
      const draft = await draftFor(creator.id, "mural", "mural");
      expect(draft.status).toBe(201);
      const submitted = await request(appFor())
        .post(`/api/tattoo-bookings/${draft.body.id}/submit`)
        .send({ uploadToken: draft.body.uploadToken });
      expect(submitted.status).toBe(200);
      const details = await request(appFor(creator)).get(`/api/creator-inquiries/${draft.body.id}`);
      expect(details.body.requestType).toBe("Mural");
      expect(creatorEmail).toHaveBeenCalledWith(
        expect.objectContaining({ requestType: "Mural" }),
        expect.objectContaining({ id: creator.id }),
      );
    } finally {
      await pool.query("UPDATE users SET inquiry_options=ARRAY['Tattoo','Painting','Other']::text[] WHERE id=$1", [creator.id]);
    }
  });
});

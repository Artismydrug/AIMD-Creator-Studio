import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";

const { sendNotification, uploadPrivateObject, sanitizeMedia } = vi.hoisted(() => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
  uploadPrivateObject: vi
    .fn()
    .mockResolvedValue("/objects/tattoo-booking-test-reference"),
  sanitizeMedia: vi.fn().mockImplementation(
    async (buffer: Buffer, contentType: string) => ({
      buffer,
      contentType,
      sha256: "test-sha256",
    }),
  ),
}));

vi.mock("../lib/tattooBookingEmail", () => ({
  sendTattooBookingNotification: sendNotification,
}));

vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: class {
    uploadObjectEntity = uploadPrivateObject;
    getWorkshopVideoPlaybackURL = vi.fn().mockResolvedValue("https://example.test/private-reference");
  },
}));

vi.mock("../lib/sanitizeChallengeMedia", () => ({
  sanitizeChallengeMedia: sanitizeMedia,
}));

import tattooBookingsRouter from "./tattoo-bookings";
import notificationsRouter from "./notifications";
import { DEFAULT_INQUIRY_FORM_CONFIG } from "../lib/inquiryFormDefaults";

const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const testEmail = `tattoo_booking_${suffix}@example.test`;
const creatorName = `inquiry_creator_${suffix}`;
let creatorId: number;

function appFor(role: "public" | "member" | "admin" | "creator" = "public"): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).log = {
      error: () => undefined,
      warn: () => undefined,
      info: () => undefined,
    };
    if (role !== "public") {
      (req as any).dbUser = {
        id: role === "creator" ? creatorId : role === "admin" ? 999_999 : 999_998,
        email: `${role}@example.test`,
        username: role,
        isAdmin: role === "admin",
      };
    }
    next();
  });
  app.use("/api", tattooBookingsRouter);
  app.use("/api", notificationsRouter);
  return app;
}

beforeAll(async () => {
  const { rows } = await pool.query(
    "INSERT INTO users (email, username, booking_open) VALUES ($1, $2, true) RETURNING id",
    [`creator_${testEmail}`, creatorName],
  );
  creatorId = rows[0].id;
});

beforeEach(() => {
  sendNotification.mockClear();
});

afterAll(async () => {
  await pool.query("DELETE FROM tattoo_bookings WHERE email = $1", [testEmail]);
  if (creatorId) await pool.query("DELETE FROM users WHERE id = $1", [creatorId]);
});

describe("tattoo booking intake", () => {
  it("preserves the existing public studio intake without a profile recipient", async () => {
    const draft = await request(appFor()).post("/api/tattoo-bookings")
      .set("User-Agent", `legacy-public-intake-${suffix}`)
      .send({
        requestType: "tattoo", name: "Legacy Client", email: testEmail,
        idea: "A custom traditional tattoo design", placement: "Arm",
        estimatedSize: "4 inches", preferredArtist: "Studio team", website: "",
      });
    expect(draft.status).toBe(201);
    const { rows } = await pool.query("SELECT recipient_user_id FROM tattoo_bookings WHERE id = $1", [draft.body.id]);
    expect(rows[0].recipient_user_id).toBeNull();
  });

  it("uses the creator's saved form and rejects disabled categories", async () => {
    const config = structuredClone(DEFAULT_INQUIRY_FORM_CONFIG);
    config.categories[0].enabled = false;
    config.categories[1].label = "Custom portraits";
    config.categories[1].questions[0].label = "Who should I paint?";
    await pool.query("UPDATE users SET inquiry_form_config = $1::jsonb WHERE id = $2", [JSON.stringify(config), creatorId]);
    try {
      const payload = {
        recipientUserId: creatorId, requestType: "tattoo", name: "Custom Inquiry",
        email: testEmail, idea: "A portrait of my favorite musician", placement: "Living room",
        estimatedSize: "24 inches", preferredArtist: "Ignored client-provided artist", website: "",
      };
      expect((await request(appFor()).post("/api/tattoo-bookings").send(payload)).status).toBe(400);
      const draft = await request(appFor()).post("/api/tattoo-bookings").send({ ...payload, requestType: "painting" });
      expect(draft.status).toBe(201);
      const { rows } = await pool.query("SELECT category_label, form_snapshot FROM tattoo_bookings WHERE id = $1", [draft.body.id]);
      expect(rows[0].category_label).toBe("Custom portraits");
      expect(rows[0].form_snapshot.questions[0].label).toBe("Who should I paint?");
    } finally {
      await pool.query("UPDATE users SET inquiry_form_config = NULL WHERE id = $1", [creatorId]);
    }
  });

  it("preserves the inquiry and inbox alert if email delivery fails", async () => {
    const draft = await request(appFor()).post("/api/tattoo-bookings").send({
      recipientUserId: creatorId, requestType: "other", name: "Email Failure Test",
      email: testEmail, idea: "A community mural project for next year", placement: "Community center",
      estimatedSize: "One wall", preferredArtist: "Ignored client-provided artist", website: "",
    });
    expect(draft.status).toBe(201);
    sendNotification.mockRejectedValueOnce(new Error("Temporary email failure"));
    const submitted = await request(appFor()).post(`/api/tattoo-bookings/${draft.body.id}/submit`)
      .send({ uploadToken: draft.body.uploadToken });
    expect(submitted.status).toBe(200);
    expect(submitted.body.notificationStatus).toBe("failed");
    const { rows } = await pool.query(
      "SELECT n.id FROM notifications n JOIN tattoo_bookings b ON b.id = n.booking_id WHERE b.id = $1 AND b.status = 'new' AND n.recipient_user_id = $2",
      [draft.body.id, creatorId],
    );
    expect(rows).toHaveLength(1);
  });

  it("accepts Painting and Other commission requests and emails each category", async () => {
    for (const requestType of ["painting", "other"] as const) {
      const draft = await request(appFor())
        .post("/api/tattoo-bookings")
        .set("User-Agent", `commission-${requestType}-${suffix}`)
        .send({
          recipientUserId: creatorId,
          requestType,
          name: "Commission Test",
          email: testEmail,
          idea: "An illustrated design for a community arts event",
          placement: requestType === "painting" ? "Canvas" : "Illustration and print",
          estimatedSize: requestType === "painting" ? "24 by 36 inches" : "Needed in six weeks",
          preferredArtist: "River Studio",
          website: "",
        });

      expect(draft.status).toBe(201);
      const submitted = await request(appFor())
        .post(`/api/tattoo-bookings/${draft.body.id}/submit`)
        .send({ uploadToken: draft.body.uploadToken });

      expect(submitted.status).toBe(200);
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ requestType, preferredArtist: creatorName }),
      );
    }
  });

  it("saves a private inquiry and one actionable notification only for its creator", async () => {
    const draft = await request(appFor())
      .post("/api/tattoo-bookings")
      .send({
        recipientUserId: creatorId,
        requestType: "tattoo",
        name: "Booking Test",
        email: testEmail,
        phone: "555-0101",
        idea: "A geometric black and grey forearm design",
        placement: "Left forearm",
        estimatedSize: "4 x 6 inches",
        preferredArtist: "Creator Profile",
        website: "",
      });

    expect(draft.status).toBe(201);
    expect(draft.body.id).toEqual(expect.any(Number));
    expect(draft.body.uploadToken).toEqual(expect.any(String));

    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const unauthorizedUpload = await request(appFor())
      .post(`/api/tattoo-bookings/${draft.body.id}/references`)
      .set("Content-Type", "image/png")
      .set("X-Booking-Token", "wrong-token")
      .set("X-File-Name", "reference.png")
      .send(png);
    expect(unauthorizedUpload.status).toBe(401);

    const uploaded = await request(appFor())
      .post(`/api/tattoo-bookings/${draft.body.id}/references`)
      .set("Content-Type", "image/png")
      .set("X-Booking-Token", draft.body.uploadToken)
      .set("X-File-Name", "reference.png")
      .send(png);
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.originalName).toBe("reference.png");
    expect(uploadPrivateObject).toHaveBeenCalledWith(
      expect.any(Buffer),
      "image/png",
      `tattoo-booking:${draft.body.id}`,
      "private",
    );

    const submitted = await request(appFor())
      .post(`/api/tattoo-bookings/${draft.body.id}/submit`)
      .send({ uploadToken: draft.body.uploadToken });

    expect(submitted.status).toBe(200);
    expect(submitted.body).toEqual({
      id: draft.body.id,
      status: "new",
      notificationStatus: "sent",
    });
    expect(sendNotification).toHaveBeenCalledOnce();
    const repeated = await request(appFor())
      .post(`/api/tattoo-bookings/${draft.body.id}/submit`)
      .send({ uploadToken: draft.body.uploadToken });
    expect(repeated.status).toBe(200);
    expect(sendNotification).toHaveBeenCalledOnce();
    const inbox = await request(appFor("creator")).get("/api/notifications");
    expect(inbox.status).toBe(200);
    const items = inbox.body.notifications.filter((item: { bookingId: number }) => item.bookingId === draft.body.id);
    expect(items).toHaveLength(1);
    expect(items[0].readAt).toBeNull();
    expect(items[0].inquiryDestination).toEqual({ bookingId: draft.body.id });
    expect(items[0].inquirySummary).toContain("Booking Test");
    expect((await request(appFor()).get(`/api/tattoo-bookings/${draft.body.id}/creator`)).status).toBe(401);
    expect((await request(appFor("member")).get(`/api/tattoo-bookings/${draft.body.id}/creator`)).status).toBe(404);
    const lead = await request(appFor("creator")).get(`/api/tattoo-bookings/${draft.body.id}/creator`);
    expect(lead.status).toBe(200);
    expect(lead.body.email).toBe(testEmail);
    expect(lead.body.answers.idea).toContain("geometric");
    expect(lead.body.questions).toHaveLength(3);
    expect(lead.body.references[0].url).toBe("https://example.test/private-reference");
    expect((await request(appFor("member")).patch(`/api/notifications/${items[0].id}/read`)).status).toBe(404);
    expect((await request(appFor("creator")).patch(`/api/notifications/${items[0].id}/read`)).status).toBe(200);

    const unauthenticated = await request(appFor()).get(
      "/api/admin/tattoo-bookings",
    );
    expect(unauthenticated.status).toBe(401);

    const nonAdmin = await request(appFor("member")).get(
      "/api/admin/tattoo-bookings",
    );
    expect(nonAdmin.status).toBe(403);

    const admin = await request(appFor("admin")).get(
      "/api/admin/tattoo-bookings",
    );
    expect(admin.status).toBe(200);
    expect(
      admin.body.some(
        (booking: {
          id: number;
          preferredArtist: string;
          references: unknown[];
        }) =>
          booking.id === draft.body.id &&
          booking.preferredArtist === creatorName &&
          booking.references.length === 1,
      ),
    ).toBe(true);

    const updated = await request(appFor("admin"))
      .patch(`/api/admin/tattoo-bookings/${draft.body.id}`)
      .send({ status: "contacted" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("contacted");
  });

  it("rejects honeypot submissions", async () => {
    const response = await request(appFor())
      .post("/api/tattoo-bookings")
      .send({
        recipientUserId: creatorId,
        requestType: "tattoo",
        name: "Spam Bot",
        email: "spam@example.test",
        idea: "This is long enough to satisfy the minimum",
        placement: "Arm",
        estimatedSize: "Large",
        preferredArtist: "Spam Test Studio",
        website: "https://spam.example",
      });

    expect(response.status).toBe(400);
  });
});
import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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
  },
}));

vi.mock("../lib/sanitizeChallengeMedia", () => ({
  sanitizeChallengeMedia: sanitizeMedia,
}));

import tattooBookingsRouter from "./tattoo-bookings";

const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const testEmail = `tattoo_booking_${suffix}@example.test`;

function appFor(role: "public" | "member" | "admin" = "public"): Express {
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
        id: role === "admin" ? 999_999 : 999_998,
        email: `${role}@example.test`,
        username: role,
        isAdmin: role === "admin",
      };
    }
    next();
  });
  app.use("/api", tattooBookingsRouter);
  return app;
}

beforeEach(() => {
  sendNotification.mockClear();
});

afterAll(async () => {
  await pool.query("DELETE FROM tattoo_bookings WHERE email = $1", [testEmail]);
});

describe("tattoo booking intake", () => {
  it("accepts Painting and Other commission requests and emails each category", async () => {
    for (const requestType of ["painting", "other"] as const) {
      const draft = await request(appFor())
        .post("/api/tattoo-bookings")
        .set("User-Agent", `commission-${requestType}-${suffix}`)
        .send({
          requestType,
          name: "Commission Test",
          email: testEmail,
          idea: "An illustrated design for a community arts event",
          placement: requestType === "painting" ? "Canvas" : "Illustration and print",
          estimatedSize: requestType === "painting" ? "24 by 36 inches" : "Needed in six weeks",
          preferredArtist: "Poncho The Artist",
          website: "",
        });

      expect(draft.status).toBe(201);
      const submitted = await request(appFor())
        .post(`/api/tattoo-bookings/${draft.body.id}/submit`)
        .send({ uploadToken: draft.body.uploadToken });

      expect(submitted.status).toBe(200);
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ requestType }),
      );
    }
  });

  it("stores a public request, sends the notification, and exposes it only to admins", async () => {
    const draft = await request(appFor())
      .post("/api/tattoo-bookings")
      .send({
        requestType: "tattoo",
        name: "Booking Test",
        email: testEmail,
        phone: "555-0101",
        idea: "A geometric black and grey forearm design",
        placement: "Left forearm",
        estimatedSize: "4 x 6 inches",
        preferredArtist: "Ash",
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
          booking.preferredArtist === "Ash" &&
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
        requestType: "tattoo",
        name: "Spam Bot",
        email: "spam@example.test",
        idea: "This is long enough to satisfy the minimum",
        placement: "Arm",
        estimatedSize: "Large",
        preferredArtist: "No preference",
        website: "https://spam.example",
      });

    expect(response.status).toBe(400);
  });
});
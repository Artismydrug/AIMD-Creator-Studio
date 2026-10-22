import express, {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { and, count, desc, eq, gte, ne } from "drizzle-orm";
import {
  db,
  tattooBookingReferencesTable,
  tattooBookingsTable,
  usersTable,
} from "@workspace/db";
import {
  CreateTattooBookingDraftBody,
  CreateTattooBookingDraftResponse,
  GetStudioInquiryParams,
  GetStudioInquiryResponse,
  ListAdminTattooBookingsResponse,
  SubmitTattooBookingBody,
  SubmitTattooBookingParams,
  SubmitTattooBookingResponse,
  UpdateAdminTattooBookingBody,
  UpdateAdminTattooBookingParams,
  UpdateAdminTattooBookingResponse,
  UploadTattooBookingReferenceHeader,
  UploadTattooBookingReferenceParams,
  UploadTattooBookingReferenceResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { ObjectStorageService } from "../lib/objectStorage";
import { sanitizeChallengeMedia } from "../lib/sanitizeChallengeMedia";
import { sendTattooBookingNotification } from "../lib/tattooBookingEmail";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const BOOKING_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const BOOKING_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const BOOKING_RATE_LIMIT_MAX = 5;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_REFERENCES = 6;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

type BookingRow = typeof tattooBookingsTable.$inferSelect;

type UploadRequest = Request & {
  tattooBookingUpload?: BookingRow;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function requestFingerprint(req: Request): string {
  const secret = process.env.SESSION_SECRET || "aimd-booking-rate-limit";
  return createHash("sha256")
    .update(`${secret}|${req.ip}|${req.get("user-agent") || "unknown"}`)
    .digest("hex");
}

function cleanFileName(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const cleaned = decoded
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "-")
    .trim();
  return cleaned.slice(0, 180) || "reference-image";
}

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return "image/heic";
  }
  return null;
}

async function findBookingWithReferences(bookingId: number) {
  const [booking] = await db
    .select()
    .from(tattooBookingsTable)
    .where(eq(tattooBookingsTable.id, bookingId))
    .limit(1);
  if (!booking) return null;

  const references = await db
    .select()
    .from(tattooBookingReferencesTable)
    .where(eq(tattooBookingReferencesTable.bookingId, bookingId))
    .orderBy(tattooBookingReferencesTable.createdAt);

  return {
    ...booking,
    references,
  };
}

function toBookingResponse(
  booking: NonNullable<Awaited<ReturnType<typeof findBookingWithReferences>>>,
) {
  return {
    id: booking.id,
    requestType: booking.requestType,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    idea: booking.idea,
    placement: booking.placement,
    estimatedSize: booking.estimatedSize,
    preferredArtist: booking.preferredArtist,
    status: booking.status,
    notificationStatus: booking.notificationStatus,
    notificationError: booking.notificationError,
    references: booking.references.map((reference) => ({
      id: reference.id,
      url: `/api/storage${reference.objectPath}`,
      originalName: reference.originalName,
      contentType: reference.contentType,
      sizeBytes: reference.sizeBytes,
    })),
    submittedAt: booking.submittedAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

async function authorizeBookingUpload(
  req: UploadRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const params = UploadTattooBookingReferenceParams.safeParse(req.params);
  const header = UploadTattooBookingReferenceHeader.safeParse({
    "X-Booking-Token": req.get("x-booking-token"),
    "X-File-Name": req.get("x-file-name"),
  });
  if (!params.success || !header.success) {
    res.status(400).json({ error: "Booking token and file name are required" });
    return;
  }

  const [booking] = await db
    .select()
    .from(tattooBookingsTable)
    .where(eq(tattooBookingsTable.id, params.data.bookingId))
    .limit(1);

  if (
    !booking ||
    booking.status !== "draft" ||
    booking.uploadTokenExpiresAt.getTime() <= Date.now() ||
    !tokenMatches(header.data["X-Booking-Token"], booking.uploadTokenHash)
  ) {
    res.status(401).json({ error: "Booking upload token is invalid or expired" });
    return;
  }

  req.tattooBookingUpload = booking;
  next();
}

router.post("/tattoo-bookings", async (req, res): Promise<void> => {
  const parsed = CreateTattooBookingDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete every required booking field" });
    return;
  }
  if (parsed.data.website?.trim()) {
    res.status(400).json({ error: "Unable to accept this booking request" });
    return;
  }
  if (parsed.data.creatorUserId) {
    const [creator] = await db
      .select({ bookingOpen: usersTable.bookingOpen })
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.creatorUserId))
      .limit(1);
    if (!creator?.bookingOpen) {
      res.status(404).json({ error: "This creator is not accepting in-app inquiries." });
      return;
    }
  }

  const fingerprint = requestFingerprint(req);
  const [recent] = await db
    .select({ value: count() })
    .from(tattooBookingsTable)
    .where(
      and(
        eq(tattooBookingsTable.requestFingerprint, fingerprint),
        gte(
          tattooBookingsTable.createdAt,
          new Date(Date.now() - BOOKING_RATE_LIMIT_WINDOW_MS),
        ),
      ),
    );
  if (Number(recent?.value ?? 0) >= BOOKING_RATE_LIMIT_MAX) {
    res.status(429).json({
      error: "Too many recent booking attempts. Please try again later.",
    });
    return;
  }

  const uploadToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + BOOKING_TOKEN_TTL_MS);
  const [booking] = await db
    .insert(tattooBookingsTable)
    .values({
      creatorUserId: parsed.data.creatorUserId ?? null,
      requestType: parsed.data.requestType,
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone?.trim() || null,
      idea: parsed.data.idea.trim(),
      placement: parsed.data.placement.trim(),
      estimatedSize: parsed.data.estimatedSize.trim(),
      preferredArtist: parsed.data.preferredArtist,
      uploadTokenHash: hashToken(uploadToken),
      uploadTokenExpiresAt: expiresAt,
      requestFingerprint: fingerprint,
    })
    .returning({ id: tattooBookingsTable.id });

  res.status(201).json(
    CreateTattooBookingDraftResponse.parse({
      id: booking.id,
      uploadToken,
      expiresAt,
    }),
  );
});

router.post(
  "/tattoo-bookings/:bookingId/references",
  authorizeBookingUpload,
  express.raw({
    type: (req) => {
      const contentType = (req.headers["content-type"] || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      return ALLOWED_IMAGE_TYPES.has(contentType);
    },
    limit: MAX_REFERENCE_BYTES,
  }),
  async (req: UploadRequest, res: Response): Promise<void> => {
    const booking = req.tattooBookingUpload;
    if (!booking || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "A supported reference image is required" });
      return;
    }

    const [existing] = await db
      .select({ value: count() })
      .from(tattooBookingReferencesTable)
      .where(eq(tattooBookingReferencesTable.bookingId, booking.id));
    if (Number(existing?.value ?? 0) >= MAX_REFERENCES) {
      res.status(400).json({ error: "A booking can include up to 6 images" });
      return;
    }

    const detectedType = detectImageType(req.body);
    if (!detectedType) {
      res.status(400).json({ error: "File content is not a supported image" });
      return;
    }

    try {
      const sanitized = await sanitizeChallengeMedia(req.body, detectedType);
      const objectPath = await objectStorageService.uploadObjectEntity(
        sanitized.buffer,
        sanitized.contentType,
        `tattoo-booking:${booking.id}`,
        "private",
      );
      const [reference] = await db
        .insert(tattooBookingReferencesTable)
        .values({
          bookingId: booking.id,
          objectPath,
          originalName: cleanFileName(req.get("x-file-name") || "reference-image"),
          contentType: sanitized.contentType,
          sizeBytes: sanitized.buffer.length,
        })
        .returning();

      res.status(201).json(
        UploadTattooBookingReferenceResponse.parse({
          id: reference.id,
          url: `/api/storage${reference.objectPath}`,
          originalName: reference.originalName,
          contentType: reference.contentType,
          sizeBytes: reference.sizeBytes,
        }),
      );
    } catch (error) {
      req.log.error({ err: error, bookingId: booking.id }, "Booking reference upload failed");
      res.status(500).json({ error: "Failed to store reference image" });
    }
  },
);

router.post(
  "/tattoo-bookings/:bookingId/submit",
  async (req, res): Promise<void> => {
    const params = SubmitTattooBookingParams.safeParse(req.params);
    const body = SubmitTattooBookingBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid booking submission" });
      return;
    }

    const booking = await findBookingWithReferences(params.data.bookingId);
    if (!booking) {
      res.status(404).json({ error: "Booking draft not found" });
      return;
    }
    if (
      booking.uploadTokenExpiresAt.getTime() <= Date.now() ||
      !tokenMatches(body.data.uploadToken, booking.uploadTokenHash)
    ) {
      res.status(401).json({ error: "Booking token is invalid or expired" });
      return;
    }

    if (booking.status !== "draft") {
      res.json(
        SubmitTattooBookingResponse.parse({
          id: booking.id,
          status: booking.status,
          notificationStatus: booking.notificationStatus,
        }),
      );
      return;
    }

    const submittedAt = new Date();
    const submission = await db.transaction(async (tx) => {
      const [submitted] = await tx
        .update(tattooBookingsTable)
        .set({
          status: "new",
          submittedAt,
          updatedAt: submittedAt,
        })
        .where(
          and(
            eq(tattooBookingsTable.id, booking.id),
            eq(tattooBookingsTable.status, "draft"),
          ),
        )
        .returning();
      if (!submitted) {
        const [current] = await tx
          .select()
          .from(tattooBookingsTable)
          .where(eq(tattooBookingsTable.id, booking.id))
          .limit(1);
        return { booking: current, firstSubmission: false };
      }
      if (booking.creatorUserId) {
        await tx.execute(sql`
          INSERT INTO notifications (recipient_user_id, type, booking_id)
          VALUES (${booking.creatorUserId}, 'commission_inquiry', ${booking.id})
          ON CONFLICT (booking_id) DO NOTHING
        `);
      }
      return { booking: submitted, firstSubmission: true };
    });
    if (!submission.booking) {
      res.status(404).json({ error: "Booking draft not found" });
      return;
    }
    if (!submission.firstSubmission) {
      res.json(
        SubmitTattooBookingResponse.parse({
          id: submission.booking.id,
          status: submission.booking.status,
          notificationStatus: submission.booking.notificationStatus,
        }),
      );
      return;
    }
    const submitted = submission.booking;

    let notificationStatus: "sent" | "failed" = "sent";
    try {
      await sendTattooBookingNotification({
        id: submitted.id,
        requestType: submitted.requestType,
        name: submitted.name,
        email: submitted.email,
        phone: submitted.phone,
        idea: submitted.idea,
        placement: submitted.placement,
        estimatedSize: submitted.estimatedSize,
        preferredArtist: submitted.preferredArtist,
        references: booking.references,
      });
      await db
        .update(tattooBookingsTable)
        .set({
          notificationStatus: "sent",
          notificationError: null,
          notificationSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tattooBookingsTable.id, submitted.id));
    } catch (error) {
      notificationStatus = "failed";
      const message = error instanceof Error ? error.message : "Unknown email error";
      req.log.error(
        { err: error, bookingId: submitted.id },
        "Tattoo booking notification failed",
      );
      await db
        .update(tattooBookingsTable)
        .set({
          notificationStatus: "failed",
          notificationError: message.slice(0, 1000),
          updatedAt: new Date(),
        })
        .where(eq(tattooBookingsTable.id, submitted.id));
    }

    res.json(
      SubmitTattooBookingResponse.parse({
        id: submitted.id,
        status: "new",
        notificationStatus,
      }),
    );
  },
);

router.get(
  "/studio-inquiries/:bookingId",
  async (req, res): Promise<void> => {
    if (!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
    const params = GetStudioInquiryParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid inquiry ID" }); return; }
    const booking = await findBookingWithReferences(params.data.bookingId);
    if (
      !booking ||
      booking.creatorUserId !== req.dbUser.id ||
      booking.status === "draft"
    ) {
      res.status(404).json({ error: "Inquiry not found" });
      return;
    }
    res.json(GetStudioInquiryResponse.parse({
      id: booking.id,
      requestType: booking.requestType,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      idea: booking.idea,
      placement: booking.placement,
      estimatedSize: booking.estimatedSize,
      preferredArtist: booking.preferredArtist,
      status: booking.status,
      references: booking.references.map((reference) => ({
        id: reference.id,
        url: `/api/storage${reference.objectPath}`,
        originalName: reference.originalName,
        contentType: reference.contentType,
        sizeBytes: reference.sizeBytes,
      })),
      submittedAt: booking.submittedAt,
    }));
  },
);

router.get(
  "/admin/tattoo-bookings",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const bookings = await db
      .select({ id: tattooBookingsTable.id })
      .from(tattooBookingsTable)
      .where(ne(tattooBookingsTable.status, "draft"))
      .orderBy(desc(tattooBookingsTable.submittedAt));
    const details = await Promise.all(
      bookings.map((booking) => findBookingWithReferences(booking.id)),
    );
    res.json(
      ListAdminTattooBookingsResponse.parse(
        details.filter((booking) => booking !== null).map(toBookingResponse),
      ),
    );
  },
);

router.patch(
  "/admin/tattoo-bookings/:bookingId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateAdminTattooBookingParams.safeParse(req.params);
    const body = UpdateAdminTattooBookingBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid booking update" });
      return;
    }

    const [updated] = await db
      .update(tattooBookingsTable)
      .set({ status: body.data.status, updatedAt: new Date() })
      .where(
        and(
          eq(tattooBookingsTable.id, params.data.bookingId),
          ne(tattooBookingsTable.status, "draft"),
        ),
      )
      .returning({ id: tattooBookingsTable.id });
    if (!updated) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const booking = await findBookingWithReferences(updated.id);
    res.json(UpdateAdminTattooBookingResponse.parse(toBookingResponse(booking!)));
  },
);

export default router;
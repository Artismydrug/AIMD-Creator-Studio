import express, { Router, type IRouter, type Request, type Response } from 'express';
import { Readable } from 'stream';
import { createHash } from 'node:crypto';
import { pool } from '@workspace/db';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import { ObjectPermission } from '../lib/objectAcl';
import { sanitizeChallengeMedia } from '../lib/sanitizeChallengeMedia';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/** Allowed MIME types for creator uploads — images only. */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);

/** Allowed MIME types for creator video uploads. */
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

/** 20 MB hard cap for images. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
/** 100 MB hard cap for videos. */
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

function hasAuthenticatedSession(req: Request): boolean {
  return !!(req as any).dbUser;
}

const CHALLENGE_UPLOAD_PURPOSES = new Set([
  'challenge_final',
  'challenge_process',
]);
const ASSIGNMENT_UPLOAD_PURPOSE = 'assignment';

function getHeader(req: Request, name: string): string | null {
  const value = req.headers[name];
  return typeof value === 'string' ? value.trim() : null;
}

function sanitizeMetadataText(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) || null;
}

function parseCaptureTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time);
}

/**
 * POST /storage/uploads
 *
 * Accepts a raw image binary (Content-Type: image/*) directly from the client.
 * Enforces MIME allowlist and 20 MB byte limit at the Express layer — not via
 * client-supplied metadata — before writing to GCS.
 * Requires authentication so arbitrary callers cannot consume storage quota.
 */
router.post(
  '/storage/uploads',
  // Authenticate BEFORE buffering the body — otherwise anonymous callers could
  // force the server to allocate up to 100 MB per request before the 401.
  (req: Request, res: Response, next) => {
    if (!hasAuthenticatedSession(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  },
  express.raw({
    type: (req) => {
      const ct = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      return ALLOWED_IMAGE_TYPES.has(ct) || ALLOWED_VIDEO_TYPES.has(ct);
    },
    limit: MAX_VIDEO_UPLOAD_BYTES,
  }),
  async (req: Request, res: Response) => {
    const contentType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();

    // Reject if express.raw declined to parse (unsupported content-type)
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Only image (jpeg, png, webp, gif, heic) or video (mp4, mov, webm) uploads are allowed' });
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);
    if (!isImage && !isVideo) {
      res.status(400).json({ error: 'Only image or video uploads are allowed' });
      return;
    }

    if (isImage && req.body.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'Images must be 20 MB or smaller' });
      return;
    }

    // Validate first bytes as a known image/video magic number
    const magic = isImage
      ? validateImageMagicBytes(req.body)
      : validateVideoMagicBytes(req.body);
    if (!magic) {
      res.status(400).json({ error: 'File content does not match a supported format' });
      return;
    }

    const purpose = getHeader(req, 'x-aimd-upload-purpose');
    const isChallengeProof = purpose !== null && CHALLENGE_UPLOAD_PURPOSES.has(purpose);
    const isAssignmentFootage = purpose === ASSIGNMENT_UPLOAD_PURPOSE;
    const captureSource = getHeader(req, 'x-aimd-capture-source');
    const capturedAt = parseCaptureTimestamp(getHeader(req, 'x-aimd-captured-at'));
    const exifTimestamp = parseCaptureTimestamp(getHeader(req, 'x-aimd-exif-timestamp'));
    const devicePlatform = getHeader(req, 'x-aimd-device-platform');
    const cameraFacing = getHeader(req, 'x-aimd-camera-facing');

    if (purpose && !isChallengeProof && !isAssignmentFootage) {
      res.status(400).json({ error: 'Invalid proof upload purpose' });
      return;
    }
    if (isAssignmentFootage && !isVideo) {
      res.status(400).json({ error: 'Assignment uploads must be video footage' });
      return;
    }

    if (isChallengeProof) {
      const allowedSource =
        captureSource === 'native_camera' || captureSource === 'media_library';
      if (!allowedSource) {
        res.status(400).json({ error: 'Capture source is required for proof uploads' });
        return;
      }
      if (purpose === 'challenge_final' && captureSource !== 'native_camera') {
        res.status(400).json({ error: 'Final challenge media must be captured in the app' });
        return;
      }
      if (purpose === 'challenge_final' && !capturedAt) {
        res.status(400).json({ error: 'Final challenge media requires a native capture timestamp' });
        return;
      }
      if (capturedAt && capturedAt.getTime() > Date.now() + 5 * 60 * 1000) {
        res.status(400).json({ error: 'Capture timestamp cannot be in the future' });
        return;
      }
      if (devicePlatform !== 'ios' && devicePlatform !== 'android') {
        res.status(400).json({ error: 'Proof uploads require a supported native platform' });
        return;
      }
      if (
        cameraFacing &&
        cameraFacing !== 'front' &&
        cameraFacing !== 'back'
      ) {
        res.status(400).json({ error: 'Invalid camera-facing value' });
        return;
      }
    }

    try {
      const ownerId = String((req as any).dbUser.id);
      const storedMedia = isChallengeProof || isAssignmentFootage
        ? await sanitizeChallengeMedia(req.body, contentType)
        : { buffer: req.body, contentType };
      const sha256 = createHash('sha256')
        .update(storedMedia.buffer)
        .digest('hex');
      const objectPath = await objectStorageService.uploadObjectEntity(
        storedMedia.buffer,
        storedMedia.contentType,
        ownerId,
        isAssignmentFootage ? 'private' : 'public',
      );

      if (isChallengeProof) {
        const captureMetadata = {
          evidenceLevel: 'self_attested',
          devicePlatform,
          cameraFacing: cameraFacing ?? undefined,
          deviceMake: sanitizeMetadataText(getHeader(req, 'x-aimd-device-make')) ?? undefined,
          deviceModel: sanitizeMetadataText(getHeader(req, 'x-aimd-device-model')) ?? undefined,
          software: sanitizeMetadataText(getHeader(req, 'x-aimd-device-software')) ?? undefined,
        };
        await pool.query(
          `INSERT INTO challenge_media_uploads
             (user_id, object_path, purpose, media_type, content_type, sha256,
              capture_source, captured_at, exif_timestamp, capture_metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
          [
            Number(ownerId),
            objectPath,
            purpose,
            isVideo ? 'video' : 'image',
            storedMedia.contentType,
            sha256,
            captureSource,
            capturedAt,
            exifTimestamp,
            JSON.stringify(captureMetadata),
          ],
        );
      }

      res.json({
        objectPath,
        mediaType: isVideo ? 'video' : 'image',
        sha256,
        proofRecorded: isChallengeProof,
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error uploading object');
      res.status(500).json({ error: 'Failed to upload image' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * Unconditionally public — no authentication or ACL checks.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve user-uploaded image objects from PRIVATE_OBJECT_DIR.
 * Content-Type is validated against the image allowlist before serving.
 * Security headers prevent content sniffing and script execution.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // Enforce ACL: only objects with an explicit public-read policy are served.
    // Objects without an ACL (unrelated private uploads) are rejected.
    const canAccess = (req.dbUser as any)?.isAdmin === true || await objectStorageService.canAccessObjectEntity({
      userId: req.dbUser ? String(req.dbUser.id) : undefined,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    // Validate stored content type is an image before serving.
    const contentType = response.headers.get('content-type') ?? '';
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(baseType) && !ALLOWED_VIDEO_TYPES.has(baseType)) {
      res.status(415).json({ error: 'Object is not a permitted media type' });
      return;
    }

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'");

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

/**
 * Validate that the buffer starts with a known image magic-byte signature.
 * Returns the detected MIME type or null if unrecognized.
 */
function validateImageMagicBytes(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) return 'image/png';

  // GIF: 47 49 46 38
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
  ) return 'image/gif';

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';

  // HEIC/HEIF: ftyp box — bytes 4-7 are 'ftyp'
  if (
    buf.length >= 12 &&
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
  ) return 'image/heic';

  return null;
}

/**
 * Validate that the buffer starts with a known video container signature.
 * Returns the detected MIME type or null if unrecognized.
 */
function validateVideoMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // MP4 / MOV: ISO BMFF — bytes 4-7 are 'ftyp'
  if (
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
  ) return 'video/mp4';

  // WebM / Matroska: EBML header 1A 45 DF A3
  if (
    buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
  ) return 'video/webm';

  return null;
}

export default router;

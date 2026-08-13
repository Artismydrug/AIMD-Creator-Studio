import express, { Router, type IRouter, type Request, type Response } from 'express';
import { Readable } from 'stream';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import { ObjectPermission } from '../lib/objectAcl';

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

/** 20 MB hard cap enforced at the Express layer. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function hasAuthenticatedSession(req: Request): boolean {
  return !!(req as any).dbUser;
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
  express.raw({
    type: (req) => {
      const ct = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      return ALLOWED_IMAGE_TYPES.has(ct);
    },
    limit: MAX_UPLOAD_BYTES,
  }),
  async (req: Request, res: Response) => {
    if (!hasAuthenticatedSession(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();

    // Reject if express.raw declined to parse (non-image content-type)
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Only image uploads are allowed (image/jpeg, image/png, image/webp, image/gif, image/heic)' });
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      res.status(400).json({ error: 'Only image uploads are allowed' });
      return;
    }

    // Validate first bytes as a known image magic number
    const magic = validateImageMagicBytes(req.body);
    if (!magic) {
      res.status(400).json({ error: 'File content does not match a supported image format' });
      return;
    }

    try {
      const ownerId = String((req as any).dbUser.id);
      const objectPath = await objectStorageService.uploadObjectEntity(
        req.body,
        contentType,
        ownerId,
      );
      res.json({ objectPath });
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
    const canAccess = await objectStorageService.canAccessObjectEntity({
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
    if (!ALLOWED_IMAGE_TYPES.has(baseType)) {
      res.status(415).json({ error: 'Object is not a permitted image type' });
      return;
    }

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");

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

export default router;

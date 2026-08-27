import express, { Router, type IRouter, type Request, type Response } from 'express';
import { Readable } from 'stream';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

/**
 * Allowed MIME types for instructor audio feedback.
 * Only used for instructor_feedback purpose — not accepted for general uploads.
 */
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',     // MP3
  'audio/mp4',      // M4A / AAC in MP4
  'audio/aac',      // raw AAC
  'audio/ogg',      // OGG Vorbis/Opus
  'audio/webm',     // WebM audio
  'audio/wav',      // PCM WAV
  'audio/x-wav',    // alternate WAV MIME
]);

/** 20 MB hard cap for images. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
/** 100 MB hard cap for videos. */
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
/** 25 MB cap for instructor audio feedback. */
const MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024;

function hasAuthenticatedSession(req: Request): boolean {
  return !!(req as any).dbUser;
}

/**
 * Instructor read-access to student assignment footage.
 *
 * Assignment submissions are private objects owned by the student, so the
 * standard ACL only admits the owner (or an admin). An instructor who is
 * ASSIGNED to the workshop of the assignment must also be able to stream the
 * footage to review it. This checks, DB-authoritatively:
 *
 *   requesting user → instructor_profiles.user_id
 *     → workshop_instructors (assigned to workshop W)
 *     → assignments in W whose submission_url references this object
 *
 * Exported for integration tests.
 */
export async function canInstructorAccessSubmission(
  userId: number,
  objectPath: string,
): Promise<boolean> {
  const submissionUrl = `/api/storage${objectPath}`;
  const { rows } = await pool.query(
    `SELECT 1
       FROM assignments a
       JOIN workshop_instructors wi ON wi.workshop_id = a.workshop_id
       JOIN instructor_profiles ip ON ip.id = wi.instructor_id
      WHERE a.submission_url = $1
        AND ip.user_id = $2
      LIMIT 1`,
    [submissionUrl, userId],
  );
  return rows.length > 0;
}

const CHALLENGE_UPLOAD_PURPOSES = new Set([
  'challenge_final',
  'challenge_process',
]);
const ASSIGNMENT_UPLOAD_PURPOSE = 'assignment';
const INSTRUCTOR_FEEDBACK_PURPOSE = 'instructor_feedback';
const HABIT_PROOF_UPLOAD_PURPOSE = 'habit_proof';
const STUDIO_POST_UPLOAD_PURPOSE = 'studio_post';

/** Hard cap for assignment drill submissions. */
const ASSIGNMENT_MAX_DURATION_SECONDS = 30;
/** Studio videos stay short enough for swipe-feed playback. */
const STUDIO_POST_MAX_DURATION_SECONDS = 60;
/** Studio videos are capped below the route-wide video ceiling. */
const STUDIO_POST_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Discriminated result from ffprobe measurement.
 * - ok: true  → duration was measured successfully
 * - ok: false → ffprobe failed, the upload is unreadable (fail-closed)
 */
type DurationResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: 'ffprobe_unavailable' | 'no_video_stream' | 'unreadable' };

/**
 * Use ffprobe to measure the actual duration of a video buffer.
 * Writes to a temp file, runs ffprobe, cleans up, and returns a discriminated result.
 *
 * FAIL CLOSED: returns { ok: false } when ffprobe is unavailable, the file is
 * unreadable, or no video stream is present — callers must reject the upload.
 */
async function measureVideoDurationSeconds(
  videoBuffer: Buffer,
): Promise<DurationResult> {
  let tmpDir: string | null = null;
  let tmpPath: string | null = null;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'aimd-video-'));
    tmpPath = join(tmpDir, 'upload.bin');
    await writeFile(tmpPath, videoBuffer);

    return await new Promise<DurationResult>((resolve) => {
      execFile(
        'ffprobe',
        [
          '-v', 'error',
          '-select_streams', 'v:0',
          '-show_entries', 'stream=index:format=duration',
          '-of', 'json',
          tmpPath!,
        ],
        { timeout: 15_000 },
        (err, stdout, stderr) => {
          if (err) {
            // ffprobe process failed — could be unavailable or file unreadable
            const reason =
              err.code === 'ENOENT' ? 'ffprobe_unavailable' : 'unreadable';
            resolve({ ok: false, reason });
            return;
          }
          try {
            const probe = JSON.parse(stdout) as {
              streams?: Array<{ index?: number }>;
              format?: { duration?: string };
            };
            if (!probe.streams?.length) {
              resolve({ ok: false, reason: 'no_video_stream' });
              return;
            }
            const parsed = Number(probe.format?.duration);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              resolve({ ok: false, reason: 'unreadable' });
              return;
            }
            resolve({ ok: true, seconds: parsed });
          } catch {
            resolve({ ok: false, reason: 'unreadable' });
          }
        },
      );
    });
  } catch {
    return { ok: false, reason: 'unreadable' };
  } finally {
    if (tmpPath) await unlink(tmpPath).catch(() => undefined);
  }
}

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
 * Accepts a raw image/video/audio binary (Content-Type: image/*, video/*, or audio/*)
 * directly from the client. Enforces MIME allowlist and byte limits at the Express
 * layer — not via client-supplied metadata — before writing to GCS.
 * Requires authentication so arbitrary callers cannot consume storage quota.
 *
 * Purpose-specific rules:
 *   - assignment:           video only; server-side ffprobe enforces ≤30 s (FAIL CLOSED)
 *   - instructor_feedback:  video OR audio; private ACL
 *   - challenge_final/process: image or video; self-attested capture metadata is retained
 *   - (no purpose):         image only; public ACL
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
      return ALLOWED_IMAGE_TYPES.has(ct) || ALLOWED_VIDEO_TYPES.has(ct) || ALLOWED_AUDIO_TYPES.has(ct);
    },
    limit: MAX_VIDEO_UPLOAD_BYTES,
  }),
  async (req: Request, res: Response) => {
    const contentType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();

    // Reject if express.raw declined to parse (unsupported content-type)
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({
        error: 'Only image (jpeg, png, webp, gif, heic), video (mp4, mov, webm), or audio (mp3, aac, ogg, wav, webm) uploads are allowed',
      });
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);
    const isAudio = ALLOWED_AUDIO_TYPES.has(contentType);

    if (!isImage && !isVideo && !isAudio) {
      res.status(400).json({ error: 'Only image, video, or audio uploads are allowed' });
      return;
    }

    // Enforce per-type size limits
    if (isImage && req.body.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'Images must be 20 MB or smaller' });
      return;
    }
    if (isAudio && req.body.length > MAX_AUDIO_UPLOAD_BYTES) {
      res.status(413).json({ error: 'Audio files must be 25 MB or smaller' });
      return;
    }
    // Videos: already capped by express.raw limit (100 MB)

    // Validate first bytes as a known magic number
    let magic: string | null;
    if (isImage) {
      magic = validateImageMagicBytes(req.body);
    } else if (isVideo) {
      magic = validateVideoMagicBytes(req.body);
    } else {
      magic = validateAudioMagicBytes(req.body);
    }
    if (!magic) {
      res.status(400).json({ error: 'File content does not match a supported format' });
      return;
    }

    const purpose = getHeader(req, 'x-aimd-upload-purpose');
    const isChallengeProof = purpose !== null && CHALLENGE_UPLOAD_PURPOSES.has(purpose);
    const isAssignmentFootage = purpose === ASSIGNMENT_UPLOAD_PURPOSE;
    const isInstructorFeedback = purpose === INSTRUCTOR_FEEDBACK_PURPOSE;
    const isHabitProof = purpose === HABIT_PROOF_UPLOAD_PURPOSE;
    const isStudioPost = purpose === STUDIO_POST_UPLOAD_PURPOSE;
    const captureSource = getHeader(req, 'x-aimd-capture-source');
    const capturedAt = parseCaptureTimestamp(getHeader(req, 'x-aimd-captured-at'));
    const exifTimestamp = parseCaptureTimestamp(getHeader(req, 'x-aimd-exif-timestamp'));
    const devicePlatform = getHeader(req, 'x-aimd-device-platform');
    const cameraFacing = getHeader(req, 'x-aimd-camera-facing');

    if (
      purpose &&
      !isChallengeProof &&
      !isAssignmentFootage &&
      !isInstructorFeedback &&
      !isHabitProof &&
      !isStudioPost
    ) {
      res.status(400).json({ error: 'Invalid upload purpose' });
      return;
    }
    if (isStudioPost && !isImage && !isVideo) {
      res.status(400).json({ error: 'Studio posts must use an image or video' });
      return;
    }
    if (isVideo && !purpose) {
      res.status(400).json({ error: 'Video uploads require a valid upload purpose' });
      return;
    }
    if (isStudioPost && isVideo && req.body.length > STUDIO_POST_MAX_VIDEO_BYTES) {
      res.status(413).json({ error: 'Studio videos must be 50 MB or smaller' });
      return;
    }
    if (isHabitProof && !isImage && !isVideo) {
      res.status(400).json({ error: 'Habit proof must be an image or video' });
      return;
    }
    if (isAssignmentFootage && !isVideo) {
      res.status(400).json({ error: 'Assignment uploads must be video footage' });
      return;
    }
    if (isInstructorFeedback && !isVideo && !isAudio) {
      res.status(400).json({ error: 'Instructor feedback media must be video or audio' });
      return;
    }
    if (!isInstructorFeedback && isAudio) {
      // Audio is only permitted for instructor_feedback
      res.status(400).json({ error: 'Audio uploads are only allowed for instructor feedback' });
      return;
    }

    // ── Server-side 30-second enforcement for assignment drill submissions ──────
    // FAIL CLOSED: if ffprobe cannot determine duration, we reject the upload.
    // This prevents bypass via corrupt containers or missing video streams.
    let measuredDurationSeconds: number | null = null;
    if (isAssignmentFootage || (isStudioPost && isVideo)) {
      const durationResult = await measureVideoDurationSeconds(req.body);
      if (!durationResult.ok) {
        const detail =
          durationResult.reason === 'ffprobe_unavailable'
            ? 'Duration measurement service unavailable'
            : durationResult.reason === 'no_video_stream'
              ? 'No video stream found in uploaded file'
              : 'Uploaded file is unreadable or corrupt';
        res.status(422).json({
          error: `${
            isAssignmentFootage ? 'Assignment' : 'Studio'
          } video could not be validated: ${detail}`,
          reason: durationResult.reason,
        });
        return;
      }
      measuredDurationSeconds = durationResult.seconds;
      const maxAllowed = isAssignmentFootage
        ? ASSIGNMENT_MAX_DURATION_SECONDS
        : STUDIO_POST_MAX_DURATION_SECONDS;
      if (measuredDurationSeconds > maxAllowed) {
        res.status(422).json({
          error: `${
            isAssignmentFootage ? 'Assignment' : 'Studio'
          } video exceeds the ${maxAllowed}-second limit`,
          measuredDurationSeconds,
          maxAllowed,
        });
        return;
      }
    }

    if (isChallengeProof) {
      const allowedSource =
        captureSource === 'native_camera' || captureSource === 'media_library';
      if (!allowedSource) {
        res.status(400).json({ error: 'Capture source is required for proof uploads' });
        return;
      }
      if (capturedAt && capturedAt.getTime() > Date.now() + 5 * 60 * 1000) {
        res.status(400).json({ error: 'Capture timestamp cannot be in the future' });
        return;
      }
      if (devicePlatform !== 'ios' && devicePlatform !== 'android' && devicePlatform !== 'web') {
        res.status(400).json({ error: 'Proof uploads require a supported platform' });
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

    // Determine media type label for response
    const mediaType: 'image' | 'video' | 'audio' = isAudio ? 'audio' : isVideo ? 'video' : 'image';

    try {
      const ownerId = String((req as any).dbUser.id);
      const storedMedia = isChallengeProof || isAssignmentFootage || isInstructorFeedback
        ? await sanitizeChallengeMedia(req.body, contentType)
        : { buffer: req.body, contentType };
      const sha256 = createHash('sha256')
        .update(storedMedia.buffer)
        .digest('hex');
       const isPrivate = isAssignmentFootage || isInstructorFeedback || isHabitProof;
      const objectPath = await objectStorageService.uploadObjectEntity(
        storedMedia.buffer,
        storedMedia.contentType,
        ownerId,
        isPrivate ? 'private' : 'public',
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
            mediaType,
            storedMedia.contentType,
            sha256,
            captureSource,
            capturedAt,
            exifTimestamp,
            JSON.stringify(captureMetadata),
          ],
        );
      }

      if (isStudioPost && isVideo && measuredDurationSeconds !== null) {
        await pool.query(
          `INSERT INTO studio_post_media_uploads
             (user_id, object_path, media_type, measured_duration_seconds, file_size_bytes)
           VALUES ($1, $2, 'video', $3, $4)`,
          [
            Number(ownerId),
            objectPath,
            Math.ceil(measuredDurationSeconds),
            storedMedia.buffer.length,
          ],
        );
      }

      // Record the assignment media upload durably so POST /assignments can
      // verify the submission passed the ffprobe drill gate. The measured
      // duration stored here is authoritative (ceil to whole seconds).
      let recordedDurationSeconds: number | null = null;
      if (isAssignmentFootage && measuredDurationSeconds !== null) {
        recordedDurationSeconds = Math.ceil(measuredDurationSeconds);
        await pool.query(
          `INSERT INTO assignment_media_uploads
             (user_id, object_path, measured_duration_seconds, capture_source, sha256, content_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (object_path) DO NOTHING`,
          [
            Number(ownerId),
            objectPath,
            recordedDurationSeconds,
            captureSource,
            sha256,
            storedMedia.contentType,
          ],
        );
      }

      res.json({
        objectPath,
        mediaType,
        sha256,
        proofRecorded: isChallengeProof,
        measuredDurationSeconds:
          isAssignmentFootage
            ? recordedDurationSeconds
            : isStudioPost && isVideo && measuredDurationSeconds !== null
              ? Math.ceil(measuredDurationSeconds)
              : undefined,
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error uploading object');
      res.status(500).json({ error: 'Failed to upload file' });
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
 * Serve user-uploaded image/video/audio objects from PRIVATE_OBJECT_DIR.
 * Content-Type is validated against the media allowlists before serving.
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
    let canAccess = (req.dbUser as any)?.isAdmin === true || await objectStorageService.canAccessObjectEntity({
      userId: req.dbUser ? String(req.dbUser.id) : undefined,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    // Assigned instructors may read student assignment footage for review.
    if (!canAccess && req.dbUser) {
      canAccess = await canInstructorAccessSubmission(req.dbUser.id, objectPath);
    }
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    // Validate stored content type is an allowed media type before serving.
    const contentType = response.headers.get('content-type') ?? '';
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(baseType) && !ALLOWED_VIDEO_TYPES.has(baseType) && !ALLOWED_AUDIO_TYPES.has(baseType)) {
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

/**
 * Validate that the buffer starts with a known audio format magic-byte signature.
 * Returns the detected MIME type or null if unrecognized.
 */
function validateAudioMagicBytes(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  // MP3: ID3 tag (49 44 33) or MPEG sync frame (FF FB / FF F3 / FF F2)
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return 'audio/mpeg'; // ID3
  if (buf[0] === 0xff && (buf[1] === 0xfb || buf[1] === 0xf3 || buf[1] === 0xf2)) return 'audio/mpeg'; // MPEG frame

  // M4A / AAC in MP4 container: ISO BMFF ftyp (same as MP4 video, MIME differs)
  if (
    buf.length >= 8 &&
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
  ) return 'audio/mp4';

  // OGG: 4F 67 67 53
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return 'audio/ogg';

  // WAV: RIFF ... WAVE
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45
  ) return 'audio/wav';

  // WebM audio: EBML header (same as WebM video — MIME type set by Content-Type header)
  if (
    buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
  ) return 'audio/webm';

  return null;
}

export default router;

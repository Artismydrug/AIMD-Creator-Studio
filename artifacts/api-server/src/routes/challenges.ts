/**
 * Challenge API routes
 *
 * GET  /challenges/current           — current week's brief + submissions with live vote counts
 * POST /challenges/submit            — submit an entry (one per creator per week)
 * POST /challenges/:id/vote          — toggle vote on a submission (no double-voting)
 */

import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  GetCurrentChallengeResponse,
  SubmitChallengeEntryBody,
  SubmitChallengeEntryResponse,
  UpdateChallengeVerificationBody,
  UpdateChallengeVerificationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the ISO year-week string for a given date, e.g. "2026-W32". */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isChallengeSubmissionOpen(
  receivedAt: Date,
  deadline: Date,
): boolean {
  return receivedAt.getTime() <= deadline.getTime();
}

type StoredChallengeMedia = {
  id: number;
  object_path: string;
  purpose: "challenge_final" | "challenge_process";
  media_type: "image" | "video";
  capture_source: "native_camera" | "media_library";
  captured_at: Date | null;
  consumed_at: Date | null;
};

// Hard-coded current challenge brief — in a future iteration this can be
// stored in the DB so admins can manage it from a dashboard.
const CURRENT_CHALLENGE = {
  week: "Week 39",
  theme: "Ocean & Maritime",
  prompt:
    "Create a flash sheet with 3+ designs inspired by the ocean — nautical, sea creatures, waves, or maritime heritage. Any medium. Show process if you can.",
  deadline: "2026-09-26T06:59:00.000Z", // Friday Sep 25, 11:59 PM Pacific
  prize: "250 AIMD Points + Studio Ready fast-track entry",
};
const CURRENT_CHALLENGE_START = new Date("2026-08-27T00:00:00.000Z");

// ─── GET /challenges/current ──────────────────────────────────────────────────

router.get("/challenges/current", async (req, res): Promise<void> => {
  const challengeWeek = isoWeek(new Date(CURRENT_CHALLENGE.deadline));

  try {
    // Fetch all submissions for the current week with vote counts
    const { rows: submissions } = await pool.query<{
      id: number;
      challenge_week: string;
      user_id: number;
      caption: string;
      image_url: string | null;
      tags: string[];
      vote_count: number;
      created_at: string;
      username: string | null;
      verification_status: "pending_review" | "verified_authentic" | "instructor_approved";
      verification_reviewed_at: string | null;
      final_object_path: string | null;
      final_media_type: "image" | "video" | null;
      final_capture_source: "native_camera" | "media_library" | null;
      final_captured_at: string | null;
      process_object_path: string | null;
      process_media_type: "image" | "video" | null;
      process_capture_source: "native_camera" | "media_library" | null;
      process_captured_at: string | null;
    }>(`
      SELECT cs.id, cs.challenge_week, cs.user_id, cs.caption, cs.image_url,
             cs.tags, cs.vote_count, cs.created_at, u.username,
             cs.verification_status, cs.verification_reviewed_at,
             fm.object_path AS final_object_path,
             fm.media_type AS final_media_type,
             fm.capture_source AS final_capture_source,
             fm.captured_at AS final_captured_at,
             pm.object_path AS process_object_path,
             pm.media_type AS process_media_type,
             pm.capture_source AS process_capture_source,
             pm.captured_at AS process_captured_at
      FROM   challenge_submissions cs
      JOIN   users u ON u.id = cs.user_id
      LEFT JOIN challenge_media_uploads fm ON fm.id = cs.final_media_upload_id
      LEFT JOIN challenge_media_uploads pm ON pm.id = cs.process_media_upload_id
      WHERE  cs.challenge_week = $1
      ORDER  BY cs.vote_count DESC, cs.created_at ASC
    `, [challengeWeek]);

    // Determine which submissions the current user has voted on
    const votedIds = new Set<number>();
    let mySubmissionId: number | null = null;

    if (req.dbUser) {
      const userId = req.dbUser.id;

      const { rows: votes } = await pool.query<{ submission_id: number }>(
        `SELECT submission_id FROM challenge_votes WHERE user_id = $1`,
        [userId]
      );
      votes.forEach((v) => votedIds.add(v.submission_id));

      const mine = submissions.find((s) => s.user_id === userId);
      if (mine) mySubmissionId = mine.id;
    }

    const result = submissions.map((s, i) => ({
      id: s.id,
      rank: i + 1,
      challengeWeek: s.challenge_week,
      username: s.username ?? "Creator",
      initials: (s.username ?? "C")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      caption: s.caption,
      imageUrl: s.image_url,
      finalMedia: s.final_object_path && s.final_media_type && s.final_capture_source
        ? {
            mediaUrl: `/api/storage${s.final_object_path}`,
            mediaType: s.final_media_type,
            captureSource: s.final_capture_source,
            capturedAt: new Date(s.final_captured_at ?? s.created_at).toISOString(),
          }
        : s.image_url
          ? {
              mediaUrl: s.image_url,
              mediaType: "image" as const,
              captureSource: "legacy_upload" as const,
              capturedAt: new Date(s.created_at).toISOString(),
            }
          : null,
      processMedia: s.process_object_path && s.process_media_type && s.process_capture_source
        ? {
            mediaUrl: `/api/storage${s.process_object_path}`,
            mediaType: s.process_media_type,
            captureSource: s.process_capture_source,
            capturedAt: new Date(s.process_captured_at ?? s.created_at).toISOString(),
          }
        : null,
      verificationStatus: s.verification_status,
      verificationReviewedAt: s.verification_reviewed_at
        ? new Date(s.verification_reviewed_at).toISOString()
        : null,
      tags: s.tags,
      votes: s.vote_count,
      hasVoted: votedIds.has(s.id),
    }));

    res.json(GetCurrentChallengeResponse.parse({
      challenge: {
        ...CURRENT_CHALLENGE,
        challengeWeek,
        totalSubmissions: submissions.length,
      },
      submissions: result,
      hasSubmitted: mySubmissionId !== null,
      mySubmissionId: mySubmissionId ?? null,
    }));
  } catch (err) {
    req.log.error({ err }, "getCurrentChallenge error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /challenges/submit ──────────────────────────────────────────────────

router.post("/challenges/submit", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized — sign in to submit an entry" });
    return;
  }

  const parsed = SubmitChallengeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { caption, finalMedia, processMedia, tags } = parsed.data;
  const challengeWeek = isoWeek(new Date(CURRENT_CHALLENGE.deadline));
  const tagsArr: string[] = Array.isArray(tags) ? tags.map(String) : [];
  const deadline = new Date(CURRENT_CHALLENGE.deadline);
  if (!isChallengeSubmissionOpen(new Date(), deadline)) {
    res.status(410).json({ error: "This weekly challenge is closed" });
    return;
  }
    const weekStart = CURRENT_CHALLENGE_START;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const mediaPaths = [
      finalMedia.objectPath,
      ...(processMedia ? [processMedia.objectPath] : []),
    ];
    const { rows: uploads } = await client.query<StoredChallengeMedia>(
      `SELECT id, object_path, purpose, media_type, capture_source, captured_at, consumed_at
       FROM challenge_media_uploads
       WHERE user_id = $1 AND object_path = ANY($2::text[])
       FOR UPDATE`,
      [req.dbUser.id, mediaPaths],
    );

    const finalUpload = uploads.find(
      (upload) => upload.object_path === finalMedia.objectPath,
    );
    const processUpload = processMedia
      ? uploads.find((upload) => upload.object_path === processMedia.objectPath)
      : undefined;

    if (
      !finalUpload ||
      finalUpload.purpose !== "challenge_final" ||
      finalUpload.consumed_at
    ) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "A valid unused challenge proof upload is required" });
      return;
    }

    const capturedAt = finalUpload.captured_at ? new Date(finalUpload.captured_at) : null;
    if (capturedAt && (capturedAt < weekStart || capturedAt > deadline)) {
      await client.query("ROLLBACK");
      res.status(400).json({
        error: "Final media must be captured during the active challenge window",
      });
      return;
    }

    if (
      processMedia &&
      (!processUpload ||
        processUpload.purpose !== "challenge_process" ||
        processUpload.consumed_at)
    ) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Process verification upload is invalid or already used" });
      return;
    }

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO challenge_submissions
         (challenge_week, user_id, caption, final_media_upload_id,
          process_media_upload_id, verification_status, tags)
       VALUES ($1, $2, $3, $4, $5, 'pending_review', $6)
       ON CONFLICT (challenge_week, user_id) DO NOTHING
       RETURNING id`,
      [
        challengeWeek,
        req.dbUser.id,
        caption.trim(),
        finalUpload.id,
        processUpload?.id ?? null,
        tagsArr,
      ],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "You have already submitted an entry for this week" });
      return;
    }

    await client.query(
      `UPDATE challenge_media_uploads
       SET consumed_at = NOW()
       WHERE id = ANY($1::int[])`,
      [[finalUpload.id, ...(processUpload ? [processUpload.id] : [])]],
    );
    await client.query("COMMIT");

    res.status(201).json(
      SubmitChallengeEntryResponse.parse({
        submissionId: rows[0].id,
        verificationStatus: "pending_review",
      }),
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    req.log.error({ err }, "submitChallengeEntry error");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// ─── PATCH /challenges/:id/verification ───────────────────────────────────────

router.patch("/challenges/:id/verification", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const submissionId = Number(req.params.id);
  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    res.status(400).json({ error: "Invalid submission id" });
    return;
  }

  const parsed = UpdateChallengeVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { rows: reviewers } = await pool.query<{ is_admin: boolean }>(
    `SELECT is_admin FROM users WHERE id = $1`,
    [req.dbUser.id],
  );
  if (!reviewers[0]?.is_admin) {
    res.status(403).json({ error: "Instructor review access required" });
    return;
  }

  const { rows } = await pool.query<{
    verification_status: "pending_review" | "verified_authentic" | "instructor_approved";
    verification_reviewed_at: string | null;
  }>(
    `UPDATE challenge_submissions
     SET verification_status = $1,
         verification_reviewed_at = CASE
           WHEN $1::text = 'pending_review' THEN NULL
           ELSE NOW()
         END,
         verification_reviewer_id = CASE
           WHEN $1::text = 'pending_review' THEN NULL
           ELSE $2::integer
         END
     WHERE id = $3
     RETURNING verification_status, verification_reviewed_at`,
    [parsed.data.status, req.dbUser.id, submissionId],
  );

  if (!rows[0]) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  res.json(
    UpdateChallengeVerificationResponse.parse({
      submissionId,
      verificationStatus: rows[0].verification_status,
      verificationReviewedAt: rows[0].verification_reviewed_at
        ? new Date(rows[0].verification_reviewed_at).toISOString()
        : null,
    }),
  );
});

// ─── POST /challenges/:id/vote ────────────────────────────────────────────────
// Vote toggle is executed inside a serializable transaction with row-level
// locking so concurrent requests cannot diverge vote_count from the true
// number of rows in challenge_votes.

router.post("/challenges/:id/vote", async (req, res): Promise<void> => {
  if (!req.dbUser) {
    res.status(401).json({ error: "Unauthorized — sign in to vote" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const submissionId = parseInt(rawId, 10);
  if (isNaN(submissionId)) {
    res.status(400).json({ error: "Invalid submission id" });
    return;
  }

  const userId = req.dbUser.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the submission row so concurrent toggles are serialised.
    const { rows: subs } = await client.query<{ id: number }>(
      `SELECT id FROM challenge_submissions WHERE id = $1 FOR UPDATE`,
      [submissionId]
    );

    if (subs.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Check for an existing vote inside the same transaction.
    const { rows: existing } = await client.query<{ id: number }>(
      `SELECT id FROM challenge_votes WHERE submission_id = $1 AND user_id = $2`,
      [submissionId, userId]
    );

    let hasVoted: boolean;
    let newCount: number;

    if (existing.length === 0) {
      // Cast a new vote and increment the denormalised counter atomically.
      await client.query(
        `INSERT INTO challenge_votes (submission_id, user_id) VALUES ($1, $2)`,
        [submissionId, userId]
      );
      const { rows } = await client.query<{ vote_count: number }>(
        `UPDATE challenge_submissions SET vote_count = vote_count + 1 WHERE id = $1 RETURNING vote_count`,
        [submissionId]
      );
      hasVoted = true;
      newCount = rows[0].vote_count;
    } else {
      // Retract the existing vote and decrement the counter atomically.
      await client.query(
        `DELETE FROM challenge_votes WHERE submission_id = $1 AND user_id = $2`,
        [submissionId, userId]
      );
      const { rows } = await client.query<{ vote_count: number }>(
        `UPDATE challenge_submissions SET vote_count = GREATEST(0, vote_count - 1) WHERE id = $1 RETURNING vote_count`,
        [submissionId]
      );
      hasVoted = false;
      newCount = rows[0].vote_count;
    }

    await client.query("COMMIT");
    res.json({ submissionId, hasVoted, voteCount: newCount });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    req.log.error({ err }, "vote toggle failed");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;

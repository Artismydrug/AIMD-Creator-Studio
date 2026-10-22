import { pool } from "@workspace/db";

type SqlExecutor = {
  query(queryText: string): Promise<unknown>;
};

/**
 * Idempotent startup provisioning for the Creator Studio schema additions:
 *
 *  - users.stripe_customer_id (web Stripe checkout entitlements)
 *  - user_roles                (authoritative app roles)
 *  - instructor_profiles       (verified instructors, nullable user link)
 *  - workshop_instructors      (workshop ownership)
 *  - drill_prompts             (30-second drill prompts)
 *  - assignment_media_uploads  (ffprobe-verified drill videos)
 *  - assignment_extensions     (capture metadata + instructor feedback)
 *  - user_follows              (creator social graph)
 *  - studio_post_media_uploads (validated short videos bound to posts)
 *  - notifications             (private creator activity alerts)
 *
 * Statements mirror lib/db/src/schema/{users,instructor}.ts exactly and are
 * safe to run on every boot (IF NOT EXISTS everywhere, additive only). This
 * exists because drizzle-kit push cannot run headless in this environment.
 */
export async function ensureCreatorStudioSchema(
  database: SqlExecutor = pool,
): Promise<void> {
  await database.query(`
    ALTER TABLE workshops
      ADD COLUMN IF NOT EXISTS preview_video_url text,
      ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false
  `);
  await database.query(`
    ALTER TABLE workshop_modules ADD COLUMN IF NOT EXISTS preview_video_url text
  `);
  await database.query(`
    ALTER TABLE enrollments
      ADD COLUMN IF NOT EXISTS access_source text NOT NULL DEFAULT 'subscription'
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS workshop_video_uploads (
      id serial PRIMARY KEY,
      workshop_id integer NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      object_path text NOT NULL UNIQUE,
      media_path text UNIQUE,
      kind text NOT NULL CHECK (kind IN ('preview', 'lesson')),
      content_type text NOT NULL,
      expected_size integer NOT NULL,
      ready_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_unique
      ON users (stripe_customer_id)
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id serial PRIMARY KEY,
      user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'creator',
      granted_by integer REFERENCES users(id) ON DELETE SET NULL,
      granted_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS instructor_profiles (
      id serial PRIMARY KEY,
      user_id integer UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      display_name text NOT NULL,
      bio text,
      avatar_url text,
      mentor_slug text NOT NULL UNIQUE,
      verified boolean NOT NULL DEFAULT false,
      specialties text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS workshop_instructors (
      id serial PRIMARY KEY,
      workshop_id integer NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
      instructor_id integer NOT NULL REFERENCES instructor_profiles(id) ON DELETE CASCADE,
      assigned_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS workshop_instructors_unique
      ON workshop_instructors (workshop_id, instructor_id)
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS drill_prompts (
      id serial PRIMARY KEY,
      module_id integer NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
      prompt text NOT NULL,
      max_duration_seconds integer NOT NULL DEFAULT 30,
      created_by integer REFERENCES instructor_profiles(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS assignment_media_uploads (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      object_path text NOT NULL,
      measured_duration_seconds integer NOT NULL,
      capture_source text,
      sha256 text,
      content_type text,
      created_at timestamptz NOT NULL DEFAULT now(),
      claimed_assignment_id integer REFERENCES assignments(id) ON DELETE SET NULL,
      consumed_at timestamptz
    )
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS assignment_media_uploads_object_path_unique
      ON assignment_media_uploads (object_path)
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id)
    )
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS user_follows_follower_following_unique
      ON user_follows (follower_id, following_id)
  `);
  await database.query(`
    CREATE INDEX IF NOT EXISTS user_follows_following_idx
      ON user_follows (following_id)
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS studio_post_media_uploads (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      object_path text NOT NULL UNIQUE,
      media_type text NOT NULL,
      measured_duration_seconds integer NOT NULL,
      file_size_bytes integer NOT NULL,
      post_id integer UNIQUE REFERENCES studio_posts(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      consumed_at timestamptz
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id serial PRIMARY KEY,
      recipient_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      type text NOT NULL CHECK (type IN ('direct_message', 'follow', 'like', 'critique', 'commission_inquiry')),
      conversation_id integer REFERENCES conversations(id) ON DELETE CASCADE,
      post_id integer REFERENCES studio_posts(id) ON DELETE CASCADE,
      booking_id integer REFERENCES tattoo_bookings(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz
    )
  `);
  await database.query(`
    CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
      ON notifications (recipient_user_id, created_at DESC)
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS notifications_active_follow_unique
      ON notifications (recipient_user_id, actor_user_id, type)
      WHERE type = 'follow' AND read_at IS NULL
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS notifications_active_like_unique
      ON notifications (recipient_user_id, actor_user_id, post_id, type)
      WHERE type = 'like' AND read_at IS NULL
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS notifications_inquiry_booking_unique
      ON notifications (recipient_user_id, booking_id)
      WHERE type = 'commission_inquiry' AND booking_id IS NOT NULL
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS assignment_extensions (
      id serial PRIMARY KEY,
      assignment_id integer NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
      capture_source text,
      measured_duration_seconds integer,
      feedback_text text,
      feedback_audio_url text,
      feedback_video_url text,
      reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS residency_applications (
      id serial PRIMARY KEY,
      user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      portfolio_object_paths text[] NOT NULL DEFAULT '{}',
      bbp_certification_object_path text,
      introduction_video_object_path text,
      status text NOT NULL DEFAULT 'submitted',
      reviewer_note text,
      reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS hq_financial_entries (
      id serial PRIMARY KEY,
      entry_type text NOT NULL,
      amount_cents integer NOT NULL,
      effective_on date NOT NULL DEFAULT current_date,
      note text,
      created_by integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS affiliate_partners (
      id serial PRIMARY KEY,
      name text NOT NULL,
      category text NOT NULL,
      affiliate_code text NOT NULL UNIQUE,
      perk text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      created_by integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS hq_announcements (
      id serial PRIMARY KEY,
      title text NOT NULL,
      body text NOT NULL,
      audience text NOT NULL DEFAULT 'all_creators',
      delivery text NOT NULL DEFAULT 'in_app',
      created_by integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id serial PRIMARY KEY,
      blocker_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id),
      CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id)
    )
  `);
  await database.query(`
    CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
      ON user_blocks (blocked_id)
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id serial PRIMARY KEY,
      reporter_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id integer,
      reported_user_id integer,
      message_id integer,
      reason text NOT NULL,
      details text,
      status text NOT NULL DEFAULT 'open',
      reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT content_reports_one_target CHECK (
        NOT (post_id IS NOT NULL AND message_id IS NOT NULL)
        AND (post_id IS NOT NULL OR message_id IS NOT NULL OR reported_user_id IS NOT NULL)
      )
    )
  `);
  await database.query(`
    CREATE INDEX IF NOT EXISTS content_reports_status_created_idx
      ON content_reports (status, created_at DESC)
  `);
}

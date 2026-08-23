/**
 * AIMD Creator Studio — idempotent catalog seed
 *
 * Creates a genuinely multi-medium curriculum spanning tattooing, athletics,
 * visual arts, audio production, and garment design:
 *   - Poncho The Artist  / Tattoo Apprenticeship with Poncho The Artist
 *     (Visual Art & Tattooing)
 *   - Poncho The Artist  / Fine Art Foundations          (Visual Art & Tattooing)
 *   - David Singleton    / The Art of Basketball         (Athletic Creativity)
 *   - AIMD Creative Faculty / Audio Production Essentials (Music & Sound)
 *   - AIMD Creative Faculty / Garment Design Fundamentals (Garment & Textile Design)
 *
 * Where no specific person was designated (audio/garment), a single stable,
 * NON-PERSONAL verified "AIMD Creative Faculty" profile is used. It has a
 * mentorSlug and NO userId / Clerk ID, so admins can link or replace it with a
 * real instructor later without breaking the catalog.
 *
 * Instructor profiles are looked up by mentorSlug (not Clerk ID) so this
 * script is safe to run multiple times and in any environment.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-creator-studio.ts
 */

import pg from "pg";

const { Pool } = pg;

function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({ connectionString: url });
}

// ── Category definitions ──────────────────────────────────────────────────────
// Categories live as a text column on workshops (there is no categories table),
// so this list is the single source of truth for canonical category names. Every
// seeded workshop's `category` is validated against CATEGORY_NAMES before insert.

const CATEGORIES = [
  { name: "Visual Art & Tattooing", slug: "visual-art-tattooing" },
  { name: "Athletic Creativity", slug: "athletic-creativity" },
  { name: "Music & Sound", slug: "music-sound" },
  { name: "Garment & Textile Design", slug: "garment-textile-design" },
  { name: "Photography & Film", slug: "photography-film" },
] as const;

const CATEGORY_NAMES: ReadonlySet<string> = new Set(
  CATEGORIES.map((c) => c.name),
);

// ── Instructor definitions (by mentorSlug — no Clerk IDs) ─────────────────────

const INSTRUCTORS = [
  {
    mentorSlug: "poncho-the-artist",
    displayName: "Poncho The Artist",
    bio: "Founder of AIMD. Tattoo artist, educator, and creative director based in LA.",
    specialties: "Tattooing, Fine Art, Portfolio Development",
    verified: true,
  },
  {
    mentorSlug: "david-singleton",
    displayName: "David Singleton",
    bio: "Professional basketball player and creative entrepreneur bridging sport and art.",
    specialties: "Athletic Creative Expression, Branding, Performance Art",
    verified: true,
  },
  {
    // Stable, NON-PERSONAL placeholder faculty for disciplines where no specific
    // person has been designated yet. No userId / Clerk ID — link or replace via
    // admin later. Do NOT attach a real person's identity to this profile.
    mentorSlug: "aimd-creative-faculty",
    displayName: "AIMD Creative Faculty",
    bio: "Verified AIMD Creative Faculty — curriculum authored by AIMD's instructional team. Individual mentors are assigned per cohort.",
    specialties: "Audio Production, Garment Design, Multi-Medium Craft",
    verified: true,
  },
];

// ── Workshop/course definitions ────────────────────────────────────────────────

const WORKSHOPS = [
  {
    title: "Tattoo Apprenticeship with Poncho The Artist",
    description:
      "The official AIMD tattoo apprenticeship curriculum with Poncho The Artist. Build safe station habits, understand your equipment, practice foundational techniques on fake skin, and prepare a professional portfolio. Instructor videos and feedback checkpoints are published module by module.",
    instructorSlug: "poncho-the-artist",
    instructorName: "Poncho The Artist",
    tier: "workshop" as const, // paid Dedicated Artist tier (API vocabulary: "workshop")
    category: "Visual Art & Tattooing",
    durationMinutes: 255,
    modules: [
      {
        title: "Sanitation, Bloodborne Pathogens & Station Setup Protocols",
        description: "Objective: prepare a safe, professional station before any practice begins. Cover cross-contamination awareness, bloodborne-pathogen education, barriers, sharps awareness, clean-to-dirty flow, and the limits of this course: this is preparation, not a safety certification.",
        order: 1,
        durationMinutes: 35,
        drills: [
          "Set up and break down a mock station in the correct clean-to-dirty order (30 seconds).",
          "Point out every barrier, disposable, and sharps-safety step in a station walkthrough (30 seconds).",
        ],
      },
      {
        title: "Equipment Mechanics, Rotary/Coil Tuning & Voltage Setup",
        description: "Objective: build equipment literacy before touching skin. Compare rotary and coil mechanics, identify machine components, understand voltage as a setup variable, and document a safe practice configuration. Never tattoo a person without qualified, in-person supervision.",
        order: 2,
        durationMinutes: 40,
        drills: [
          "Identify rotary and coil machine components and explain their function in a 30-second walkthrough.",
          "Demonstrate a documented fake-skin voltage setup and explain what you would adjust (30 seconds).",
        ],
      },
      {
        title: "Needle Groupings (RL, RS, M1, RM) & Stencil Application",
        description: "Objective: recognize common needle groupings and place a clean stencil on fake skin. Learn RL, RS, M1, and RM terminology, cartridge checks, stencil alignment, transfer pressure, and how to avoid practicing on people before supervised training.",
        order: 3,
        durationMinutes: 40,
        drills: [
          "Identify RL, RS, M1, and RM groupings from a prepared reference set (30 seconds).",
          "Apply and smooth a stencil onto fake skin with clean alignment and no lifted edges (30 seconds).",
        ],
      },
      {
        title: "Lining Consistency & Hand Speed Drills (Fake Skin Practice)",
        description: "Objective: develop controlled hand movement on fake skin. Practice consistent depth awareness, hand speed, stretch, angle, and breathing through repeatable lines. All drills are on fake skin and are reviewed as technique practice, not permission to tattoo clients.",
        order: 4,
        durationMinutes: 45,
        drills: [
          "Pull three consistent straight lines and three controlled curves on fake skin (30 seconds).",
          "Complete a slow-to-fast hand-speed ladder while keeping line spacing consistent (30 seconds).",
        ],
      },
      {
        title: "Whip Shading, Black & Grey Transitions & Color Packing",
        description: "Objective: practice smooth value transitions and controlled saturation on fake skin. Explore whip-shading motion, black-and-grey gradients, packing consistency, and color theory while keeping setup and cleanup protocols intact.",
        order: 5,
        durationMinutes: 50,
        drills: [
          "Create a light-to-dark whip-shade gradient on fake skin in one controlled pass (30 seconds).",
          "Pack a small test block evenly and show a black-to-grey transition without overworking it (30 seconds).",
        ],
      },
      {
        title: "Client Consultations, Aftercare & Portfolio Building",
        description: "Objective: communicate professionally and present your work responsibly. Practice a respectful consultation, explain aftercare without making medical claims, photograph fake-skin studies clearly, and assemble a focused portfolio for a studio review.",
        order: 6,
        durationMinutes: 45,
        drills: [
          "Role-play a concise client consultation: idea, placement, expectations, consent, and next step (30 seconds).",
          "Show a documented fake-skin study and explain the portfolio caption and aftercare handoff (30 seconds).",
        ],
      },
    ],
  },
  {
    title: "The Art of Basketball",
    description:
      "Explore the intersection of athletic performance and creative expression. From court vision as a creative act to personal branding, storytelling through sport, and building a career beyond the game.",
    instructorSlug: "david-singleton",
    instructorName: "David Singleton",
    tier: "workshop" as const, // paid Dedicated Artist tier (API vocabulary: "workshop")
    category: "Athletic Creativity",
    durationMinutes: 180,
    modules: [
      {
        title: "Court Vision as a Creative Act",
        description: "Understanding how athletic creativity translates to artistic thinking.",
        order: 1,
        durationMinutes: 30,
      },
      {
        title: "Personal Brand & Identity",
        description: "Building your unique identity as an athlete-creator.",
        order: 2,
        durationMinutes: 30,
      },
      {
        title: "Storytelling Through Sport",
        description: "How athletes communicate their narrative visually and verbally.",
        order: 3,
        durationMinutes: 30,
      },
      {
        title: "Creative Partnerships & Collaborations",
        description: "Working with artists, brands, and media across industries.",
        order: 4,
        durationMinutes: 30,
      },
      {
        title: "Life Beyond the Game",
        description: "Transitioning your athletic career into creative entrepreneurship.",
        order: 5,
        durationMinutes: 60,
      },
    ],
  },
  {
    title: "Fine Art Foundations",
    description:
      "Build a rigorous visual-art practice: drawing fundamentals, color and composition, and developing a personal style that carries across media — from canvas to skin.",
    instructorSlug: "poncho-the-artist",
    instructorName: "Poncho The Artist",
    tier: "workshop" as const, // paid Dedicated Artist tier (API vocabulary: "workshop")
    category: "Visual Art & Tattooing",
    durationMinutes: 210,
    modules: [
      {
        title: "Drawing Fundamentals",
        description: "Line, gesture, and observational drawing to sharpen your eye and hand.",
        order: 1,
        durationMinutes: 45,
      },
      {
        title: "Value & Light",
        description: "Reading light, rendering form, and controlling contrast for depth.",
        order: 2,
        durationMinutes: 30,
      },
      {
        title: "Color Theory in Practice",
        description: "Mixing, harmony, and temperature — using color with intent.",
        order: 3,
        durationMinutes: 45,
      },
      {
        title: "Composition & Design",
        description: "Framing, balance, and focal points that guide the viewer's eye.",
        order: 4,
        durationMinutes: 30,
      },
      {
        title: "Finding Your Visual Voice",
        description: "Developing a recognizable personal style across subjects and media.",
        order: 5,
        durationMinutes: 60,
      },
    ],
  },
  {
    title: "Audio Production Essentials",
    description:
      "Go from empty session to finished track. Learn signal flow, recording, arrangement, and the fundamentals of mixing so your ideas translate into releasable audio.",
    instructorSlug: "aimd-creative-faculty",
    instructorName: "AIMD Creative Faculty",
    tier: "workshop" as const, // paid Dedicated Artist tier (API vocabulary: "workshop")
    category: "Music & Sound",
    durationMinutes: 240,
    modules: [
      {
        title: "Your Studio & Signal Flow",
        description: "DAW setup, interfaces, monitoring, and how audio moves through a session.",
        order: 1,
        durationMinutes: 45,
      },
      {
        title: "Recording Fundamentals",
        description: "Gain staging, mic technique, and capturing clean takes.",
        order: 2,
        durationMinutes: 45,
      },
      {
        title: "Arrangement & Song Structure",
        description: "Building sections, tension and release, and shaping a full track.",
        order: 3,
        durationMinutes: 45,
      },
      {
        title: "Mixing Basics",
        description: "Balance, EQ, compression, and reverb to make a mix sit together.",
        order: 4,
        durationMinutes: 45,
      },
      {
        title: "Exporting & Releasing",
        description: "Bouncing, loudness targets, and prepping audio for distribution.",
        order: 5,
        durationMinutes: 60,
      },
    ],
  },
  {
    title: "Garment Design Fundamentals",
    description:
      "Design and construct wearable pieces from concept to finished garment. Covers sketching, textiles, patternmaking, and sewing construction for aspiring garment designers.",
    instructorSlug: "aimd-creative-faculty",
    instructorName: "AIMD Creative Faculty",
    tier: "workshop" as const, // paid Dedicated Artist tier (API vocabulary: "workshop")
    category: "Garment & Textile Design",
    durationMinutes: 240,
    modules: [
      {
        title: "Design Sketching & Silhouette",
        description: "Fashion flats, croquis, and translating ideas into wearable silhouettes.",
        order: 1,
        durationMinutes: 45,
      },
      {
        title: "Textiles & Materials",
        description: "Fiber types, fabric behavior, and choosing the right material for a design.",
        order: 2,
        durationMinutes: 45,
      },
      {
        title: "Measuring & Patternmaking",
        description: "Body measurements, blocks, and drafting basic patterns.",
        order: 3,
        durationMinutes: 60,
      },
      {
        title: "Sewing & Construction",
        description: "Core seams, finishes, and assembling a garment cleanly.",
        order: 4,
        durationMinutes: 45,
      },
      {
        title: "Fit, Finishing & Presentation",
        description: "Fittings, alterations, and presenting a finished piece.",
        order: 5,
        durationMinutes: 45,
      },
    ],
  },
];

const LEGACY_TATTOO_TRACK_TITLES = [
  "Tattoo Apprenticeship Prep",
  "Tattoo Apprenticeship Prep with Poncho The Artist",
];

// ── Seed logic ────────────────────────────────────────────────────────────────

async function ensureInstructor(
  client: pg.PoolClient,
  spec: typeof INSTRUCTORS[number],
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `SELECT id FROM instructor_profiles WHERE mentor_slug = $1 LIMIT 1`,
    [spec.mentorSlug],
  );
  if (rows.length > 0) {
    console.log(`  ✓ Instructor exists: ${spec.displayName} (id=${rows[0].id})`);
    return rows[0].id;
  }

  // user_id is intentionally omitted (NULL). Non-personal faculty profiles have
  // no associated user/Clerk identity and can be linked or replaced by an admin.
  const { rows: created } = await client.query<{ id: number }>(
    `INSERT INTO instructor_profiles
       (display_name, bio, specialties, mentor_slug, verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id`,
    [spec.displayName, spec.bio, spec.specialties, spec.mentorSlug, spec.verified],
  );
  console.log(`  + Created instructor: ${spec.displayName} (id=${created[0].id})`);
  return created[0].id;
}

async function ensureWorkshop(
  client: pg.PoolClient,
  spec: typeof WORKSHOPS[number],
  instructorId: number,
): Promise<number> {
  let { rows } = await client.query<{ id: number }>(
    `SELECT id FROM workshops WHERE title = $1 LIMIT 1`,
    [spec.title],
  );
  // The first Creator Studio seed used a shorter tattoo-track name. Rename
  // that original row rather than silently starting a second course, keeping
  // enrollments, assignments, uploaded videos, and module IDs intact.
  if (rows.length === 0 && spec.title === "Tattoo Apprenticeship with Poncho The Artist") {
    const legacy = await client.query<{ id: number }>(
      `SELECT id FROM workshops WHERE title = ANY($1::text[]) LIMIT 1`,
      [LEGACY_TATTOO_TRACK_TITLES],
    );
    if (legacy.rows.length > 0) {
      await client.query(`UPDATE workshops SET title = $2 WHERE id = $1`, [
        legacy.rows[0].id,
        spec.title,
      ]);
      rows = legacy.rows;
    }
  }

  let workshopId: number;
  if (rows.length > 0) {
    workshopId = rows[0].id;
    await client.query(
      `UPDATE workshops
       SET description = $2, instructor_name = $3, tier = $4, category = $5,
           duration_minutes = $6, total_modules = $7
       WHERE id = $1`,
      [
        workshopId,
        spec.description,
        spec.instructorName,
        spec.tier,
        spec.category,
        spec.durationMinutes,
        spec.modules.length,
      ],
    );
    console.log(`  ✓ Workshop exists: "${spec.title}" (id=${workshopId})`);
  } else {
    const { rows: created } = await client.query<{ id: number }>(
      `INSERT INTO workshops
         (title, description, instructor_name, tier, category,
          duration_minutes, total_modules, enrolled_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
       RETURNING id`,
      [
        spec.title,
        spec.description,
        spec.instructorName,
        spec.tier,
        spec.category,
        spec.durationMinutes,
        spec.modules.length,
      ],
    );
    workshopId = created[0].id;
    console.log(`  + Created workshop: "${spec.title}" (id=${workshopId})`);
  }

  // Ensure instructor assignment
  const { rowCount } = await client.query(
    `SELECT 1 FROM workshop_instructors
     WHERE workshop_id = $1 AND instructor_id = $2`,
    [workshopId, instructorId],
  );
  if (!rowCount || rowCount === 0) {
    await client.query(
      `INSERT INTO workshop_instructors (workshop_id, instructor_id, assigned_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT DO NOTHING`,
      [workshopId, instructorId],
    );
    console.log(`    → Assigned instructor id=${instructorId} to workshop id=${workshopId}`);
  }

  // Ensure modules
  for (const mod of spec.modules) {
    const { rows: existingMod } = await client.query<{ id: number }>(
      `SELECT id FROM workshop_modules
       WHERE workshop_id = $1 AND "order" = $2 LIMIT 1`,
      [workshopId, mod.order],
    );
    let moduleId: number;
    if (existingMod.length === 0) {
      const { rows: createdModule } = await client.query<{ id: number }>(
        `INSERT INTO workshop_modules
           (workshop_id, title, description, "order", duration_minutes, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [
          workshopId,
          mod.title,
          mod.description,
          mod.order,
          mod.durationMinutes,
        ],
      );
      moduleId = createdModule[0].id;
      console.log(`    + Added module: "${mod.title}"`);
    } else {
      await client.query(
        `UPDATE workshop_modules
         SET title = $2, description = $3, "order" = $4, duration_minutes = $5
         WHERE id = $1`,
        [existingMod[0].id, mod.title, mod.description, mod.order, mod.durationMinutes],
      );
      moduleId = existingMod[0].id;
      console.log(`    ✓ Module exists: "${mod.title}"`);
    }

    const drills = "drills" in mod ? mod.drills : [];
    for (const prompt of drills) {
      const { rowCount: drillExists } = await client.query(
        `SELECT 1 FROM drill_prompts WHERE module_id = $1 AND prompt = $2 LIMIT 1`,
        [moduleId, prompt],
      );
      if (!drillExists) {
        await client.query(
          `INSERT INTO drill_prompts (module_id, prompt, max_duration_seconds, created_by, created_at)
           VALUES ($1, $2, 30, $3, NOW())`,
          [moduleId, prompt, instructorId],
        );
      }
    }
  }

  return workshopId;
}

async function seedCreatorStudio() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("\n── Seeding instructors ──────────────────────────────────────────");
    const instructorIds: Record<string, number> = {};
    for (const instructor of INSTRUCTORS) {
      instructorIds[instructor.mentorSlug] = await ensureInstructor(client, instructor);
    }

    console.log("\n── Seeding workshops & masterclasses ───────────────────────────");
    // Map verified instructor slugs so every workshop can be validated as
    // belonging to a verified instructor profile before it is seeded.
    const verifiedSlugs = new Set(
      INSTRUCTORS.filter((i) => i.verified).map((i) => i.mentorSlug),
    );
    for (const workshop of WORKSHOPS) {
      // Categories are not a table — validate against the canonical list so a
      // typo can never silently create an off-catalog category.
      if (!CATEGORY_NAMES.has(workshop.category)) {
        throw new Error(
          `Workshop "${workshop.title}" uses unknown category "${workshop.category}". ` +
            `Add it to CATEGORIES first.`,
        );
      }
      // Every seeded workshop must be assigned to a VERIFIED instructor profile.
      if (!verifiedSlugs.has(workshop.instructorSlug)) {
        throw new Error(
          `Workshop "${workshop.title}" is assigned to non-verified instructor ` +
            `"${workshop.instructorSlug}".`,
        );
      }
      const instructorId = instructorIds[workshop.instructorSlug];
      if (!instructorId) {
        console.warn(`  ⚠ Instructor not found for slug: ${workshop.instructorSlug}`);
        continue;
      }
      await ensureWorkshop(client, workshop, instructorId);
    }

    await client.query("COMMIT");
    console.log("\n✅ Creator Studio seed complete.\n");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedCreatorStudio().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});

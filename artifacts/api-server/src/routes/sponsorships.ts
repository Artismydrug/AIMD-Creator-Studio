import { Router } from "express";
import { db } from "@workspace/db";
import { sponsorshipsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListSponsorshipsQueryParams,
  CreateSponsorshipBody,
} from "@workspace/api-zod";

const router = Router();

const SPONSORSHIP_AMOUNTS: Record<string, number> = {
  kit: 49,
  tuition: 199,
  "full-ride": 499,
};

// GET /sponsorships
router.get("/", async (req, res) => {
  try {
    const query = ListSponsorshipsQueryParams.parse(req.query);
    const limit = query.limit ?? 20;

    const sponsorships = await db
      .select()
      .from(sponsorshipsTable)
      .orderBy(desc(sponsorshipsTable.createdAt))
      .limit(limit);

    const result = sponsorships.map((s) => ({
      id: s.id,
      sponsorName: s.anonymous ? "Anonymous Patron" : s.sponsorName,
      sponsorAvatarUrl: s.anonymous ? null : s.sponsorAvatarUrl,
      creatorId: s.creatorId,
      creatorName: s.creatorName,
      amount: s.amount,
      message: s.message,
      tier: s.tier,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// POST /sponsorships
router.post("/", async (req, res): Promise<void> => {
  if (!!!req.dbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.dbUser!.id;

  try {
    const body = CreateSponsorshipBody.parse(req.body);

    // Get sponsor info
    const [sponsor] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    // Get creator info
    const [creator] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, body.creatorId));

    if (!creator) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }

    const amount = SPONSORSHIP_AMOUNTS[body.tier] ?? 49;

    const [sponsorship] = await db
      .insert(sponsorshipsTable)
      .values({
        sponsorUserId: userId,
        sponsorName: sponsor?.username ?? "Anonymous",
        sponsorAvatarUrl: sponsor?.avatarUrl ?? null,
        creatorId: body.creatorId,
        creatorName: creator.username,
        amount,
        message: body.message ?? null,
        tier: body.tier,
        status: "pending",
        anonymous: body.anonymous ?? false,
      })
      .returning();

    // In production this would be a real Stripe checkout URL
    const checkoutUrl = `https://checkout.stripe.com/pay/demo#sponsorship-${sponsorship.id}`;

    res.status(201).json({
      sponsorship: {
        id: sponsorship.id,
        sponsorName: sponsorship.anonymous ? "Anonymous Patron" : sponsorship.sponsorName,
        sponsorAvatarUrl: sponsorship.anonymous ? null : sponsorship.sponsorAvatarUrl,
        creatorId: sponsorship.creatorId,
        creatorName: sponsorship.creatorName,
        amount: sponsorship.amount,
        message: sponsorship.message,
        tier: sponsorship.tier,
        status: sponsorship.status,
        createdAt: sponsorship.createdAt.toISOString(),
      },
      checkoutUrl,
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;

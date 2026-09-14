import { pool } from "@workspace/db";

/**
 * AIMD Points reward tiers.
 * Thresholds are lifetime points earned — creators unlock each reward as
 * their balance crosses the tier. Redemption is handled by the AIMD team
 * in person (T-shirt handoff, ticket at the door, workshop scheduling).
 */
export const REWARD_TIERS = [
  {
    points: 500,
    reward: "Free AIMD T-Shirt",
    description: "Rep the movement. Claim your shirt at any AIMD event.",
  },
  {
    points: 1000,
    reward: "Free Ticket to the Next Event",
    description: "Your entry is covered for the next ticketed AIMD event.",
  },
  {
    points: 2000,
    reward: "Free Workshop Lesson",
    description: "One expert-led workshop lesson, on the house.",
  },
] as const;

/**
 * Award points to a user: writes a ledger row and increments the balance
 * atomically in one transaction. Returns the user's new balance.
 */
export async function awardPoints(opts: {
  userId: number;
  amount: number;
  reason: string;
  awardedBy: number;
}): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO point_awards (user_id, amount, reason, awarded_by)
       VALUES ($1, $2, $3, $4)`,
      [opts.userId, opts.amount, opts.reason, opts.awardedBy]
    );
    const { rows } = await client.query<{ points: number }>(
      `UPDATE users SET points = points + $2 WHERE id = $1 RETURNING points`,
      [opts.userId, opts.amount]
    );
    if (rows.length === 0) throw new Error("User not found");
    await client.query("COMMIT");
    return rows[0].points;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

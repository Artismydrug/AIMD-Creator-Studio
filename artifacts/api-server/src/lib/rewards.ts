import { pool } from "@workspace/db";

// Points are cumulative recognition, not a currency or monthly-drop eligibility gate.

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

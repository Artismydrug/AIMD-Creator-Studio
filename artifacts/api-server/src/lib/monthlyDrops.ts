import { pool, type PoolClient } from "@workspace/db";
import type { MonthlyDrop, MonthlyDropRequest, MonthlyDropInput, MonthlyDropUpdate, MonthlyDropRequestHistory } from "@workspace/api-zod";

export class DropError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function currentDropMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

export const requestColumns = `id, drop_id AS "dropId", user_id AS "userId", status,
  requested_at AS "requestedAt", updated_at AS "updatedAt"`;
// Deleted accounts release unfulfilled reservations, but anonymous fulfilled units
// remain consumed: deleting an account must never recreate physical stock.
const dropSelect = `SELECT d.id, d.month_key AS "monthKey", d.title, d.description,
  d.items, d.stock, d.status, c.reserved, c.total AS "requestCount",
  GREATEST(0, d.stock - c.reserved)::int AS remaining
  FROM monthly_member_drops d
  CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE r.status = 'fulfilled'
        OR (r.status IN ('pending','approved') AND r.user_id IS NOT NULL))::int AS reserved
    FROM monthly_member_drop_requests r WHERE r.drop_id = d.id
  ) c`;

export async function loadDrop(id: number, client: Pick<PoolClient, "query"> = pool): Promise<MonthlyDrop> {
  const { rows } = await client.query<MonthlyDrop>(`${dropSelect} WHERE d.id = $1`, [id]);
  if (!rows[0]) throw new DropError(404, "Monthly drop not found");
  return { ...rows[0], ownRequest: null };
}

export async function listDrops(): Promise<MonthlyDrop[]> {
  const { rows } = await pool.query<MonthlyDrop>(`${dropSelect} ORDER BY d.month_key DESC LIMIT 120`);
  return rows.map(row => ({ ...row, ownRequest: null }));
}

export async function memberRewards(userId?: number) {
  if (!userId) return { points: 0, tiers: [], monthlyDrop: null, recentRequests: [] };
  const [balance, dropRows, history] = await Promise.all([
    pool.query<{ points: number }>("SELECT points FROM users WHERE id = $1", [userId]),
    pool.query<MonthlyDrop>(`${dropSelect} WHERE d.month_key = $1 AND d.status <> 'draft'`, [currentDropMonth()]),
    pool.query<MonthlyDropRequestHistory>(
      `SELECT r.id, r.drop_id AS "dropId", r.user_id AS "userId", r.status,
        r.requested_at AS "requestedAt", r.updated_at AS "updatedAt", d.month_key AS "monthKey", d.title
       FROM monthly_member_drop_requests r JOIN monthly_member_drops d ON d.id = r.drop_id
       WHERE r.user_id = $1 ORDER BY r.requested_at DESC LIMIT 24`, [userId]),
  ]);
  const row = dropRows.rows[0];
  return {
    points: balance.rows[0]?.points ?? 0,
    // Retain the legacy field for older clients; no fixed threshold offers remain.
    tiers: [],
    monthlyDrop: row ? { ...row, ownRequest: history.rows.find(r => r.dropId === row.id) ?? null } : null,
    recentRequests: history.rows,
  };
}

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function lockAccounts(client: PoolClient, ids: number[], adminId?: number) {
  const { rows } = await client.query<{ id: number; isAdmin: boolean }>(
    `SELECT id, is_admin AS "isAdmin" FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR KEY SHARE`,
    [[...new Set(ids)].sort((a, b) => a - b)]);
  if (adminId && !rows.find(row => row.id === adminId)?.isAdmin) throw new DropError(403, "Admin access required");
  return rows;
}

async function lockDrop(client: PoolClient, id: number) {
  const { rows } = await client.query("SELECT id FROM monthly_member_drops WHERE id = $1 FOR UPDATE", [id]);
  if (!rows[0]) throw new DropError(404, "Monthly drop not found");
}

export async function requestDrop(dropId: number, userId: number) {
  return transaction(async client => {
    if (!(await lockAccounts(client, [userId])).length) throw new DropError(401, "Account required");
    await lockDrop(client, dropId);
    const existing = await client.query<MonthlyDropRequest>(
      `SELECT ${requestColumns} FROM monthly_member_drop_requests WHERE drop_id = $1 AND user_id = $2`, [dropId, userId]);
    // A timed-out successful request is still successful, even after the month closes.
    if (existing.rows[0]) return { created: false, request: existing.rows[0] };
    const drop = await loadDrop(dropId, client);
    if (drop.status !== "open" || drop.monthKey !== currentDropMonth()) throw new DropError(409, "This monthly drop is not open");
    if (drop.remaining < 1) throw new DropError(409, "All available packages have been requested");
    const { rows } = await client.query<MonthlyDropRequest>(
      `INSERT INTO monthly_member_drop_requests (drop_id, user_id) VALUES ($1, $2) RETURNING ${requestColumns}`, [dropId, userId]);
    return { created: true, request: rows[0] };
  });
}

export async function createDrop(input: MonthlyDropInput, adminId: number) {
  return transaction(async client => {
    await lockAccounts(client, [adminId], adminId);
    try {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO monthly_member_drops (month_key,title,description,items,stock,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [input.monthKey, input.title.trim(), input.description?.trim() ?? "", input.items.map(v => v.trim()), input.stock, input.status ?? "draft", adminId]);
      return loadDrop(rows[0].id, client);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new DropError(409, "A drop already exists for this month. Edit that drop instead.");
      throw error;
    }
  });
}

export async function updateDrop(id: number, input: MonthlyDropUpdate, adminId: number) {
  return transaction(async client => {
    await lockAccounts(client, [adminId], adminId);
    await lockDrop(client, id);
    const old = await loadDrop(id, client);
    const title = input.title?.trim() ?? old.title;
    const description = input.description?.trim() ?? old.description;
    const items = input.items?.map(v => v.trim()) ?? old.items;
    if (old.requestCount > 0 && (title !== old.title || description !== old.description || JSON.stringify(items) !== JSON.stringify(old.items))) {
      throw new DropError(409, "Package contents cannot change after a member requests them");
    }
    if (old.requestCount > 0 && input.status === "draft") throw new DropError(409, "Close a requested drop instead of hiding it as a draft");
    if ((input.stock ?? old.stock) < old.reserved) throw new DropError(409, "Quantity cannot be lower than reserved or fulfilled packages");
    await client.query(
      `UPDATE monthly_member_drops SET title=$2, description=$3, items=$4, stock=$5, status=$6, updated_at=now() WHERE id=$1`,
      [id, title, description, items, input.stock ?? old.stock, input.status ?? old.status]);
    return loadDrop(id, client);
  });
}

export async function updateDropRequest(id: number, status: "approved" | "declined" | "fulfilled", adminId: number) {
  const target = await pool.query<MonthlyDropRequest>(`SELECT ${requestColumns} FROM monthly_member_drop_requests WHERE id=$1`, [id]);
  if (!target.rows[0]) throw new DropError(404, "Request not found");
  const targetRow = target.rows[0];
  return transaction(async client => {
    // Always lock parent accounts before child rows, including account deletion races.
    const accounts = await lockAccounts(client, [adminId, ...(targetRow.userId ? [targetRow.userId] : [])], adminId);
    await lockDrop(client, targetRow.dropId);
    const { rows } = await client.query<MonthlyDropRequest>(`SELECT ${requestColumns} FROM monthly_member_drop_requests WHERE id=$1 FOR UPDATE`, [id]);
    const old = rows[0];
    if (!old) throw new DropError(404, "Request not found");
    if (old.status === status) return old;
    if (old.status === "fulfilled") throw new DropError(409, "A fulfilled package cannot be changed");
    if (status !== "declined" && (!old.userId || !accounts.some(row => row.id === old.userId))) throw new DropError(409, "This member account is no longer active");
    if (status === "fulfilled" && old.status !== "approved") throw new DropError(409, "Approve the request before marking it fulfilled");
    if (old.status === "declined" && status === "approved" && (await loadDrop(old.dropId, client)).remaining < 1) throw new DropError(409, "No packages remain for this approval");
    const updated = await client.query<MonthlyDropRequest>(
      `UPDATE monthly_member_drop_requests SET status=$2, reviewed_by=$3, updated_at=now() WHERE id=$1 RETURNING ${requestColumns}`,
      [id, status, adminId]);
    return updated.rows[0];
  });
}

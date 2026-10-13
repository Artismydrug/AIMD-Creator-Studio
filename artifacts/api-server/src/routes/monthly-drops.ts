import { Router, type IRouter, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import {
  z,
  CreateAdminMonthlyDropBody, UpdateAdminMonthlyDropBody, UpdateAdminMonthlyDropRequestBody,
  CreateAdminMonthlyDropResponse, UpdateAdminMonthlyDropResponse, ListAdminMonthlyDropsResponse,
  ListAdminMonthlyDropRequestsResponse, RequestMonthlyDropResponse, UpdateAdminMonthlyDropRequestResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { createDrop, DropError, listDrops, requestDrop, updateDrop, updateDropRequest } from "../lib/monthlyDrops";

const router: IRouter = Router();
const guarded = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  res.vary("Authorization"); res.vary("Cookie");
  Promise.resolve(handler(req, res, next)).catch(error => {
    if (error instanceof DropError) res.status(error.status).json({ error: error.message });
    else next(error);
  });
};
function idOf(value: unknown) {
  const result = z.coerce.number().int().positive().safeParse(value);
  if (!result.success) throw new DropError(400, "A valid drop or request ID is required");
  return result.data;
}
const cleanTitle = z.string().trim().min(3).max(120);
const cleanItems = z.array(z.string().trim().min(1).max(160)).min(1).max(20);

router.post("/rewards/monthly-drops/:id/request", guarded(async (req, res) => {
  if (!req.dbUser) { res.status(401).json({ error: "Account required" }); return; }
  if (!z.object({}).strict().safeParse(req.body ?? {}).success) { res.status(400).json({ error: "Request identity comes from your signed-in account" }); return; }
  const result = await requestDrop(idOf(req.params.id), req.dbUser.id);
  res.status(result.created ? 201 : 200).json(RequestMonthlyDropResponse.parse(result.request));
}));

router.get("/admin/monthly-drops", requireAdmin, guarded(async (_req, res) => {
  res.json(ListAdminMonthlyDropsResponse.parse(await listDrops()));
}));
router.post("/admin/monthly-drops", requireAdmin, guarded(async (req, res) => {
  const parsed = CreateAdminMonthlyDropBody.strict().extend({ title: cleanTitle, items: cleanItems }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a valid month, title, items and package quantity" }); return; }
  res.status(201).json(CreateAdminMonthlyDropResponse.parse(await createDrop(parsed.data, req.dbUser!.id)));
}));
router.patch("/admin/monthly-drops/:id", requireAdmin, guarded(async (req, res) => {
  const parsed = UpdateAdminMonthlyDropBody.strict().extend({ title: cleanTitle.optional(), items: cleanItems.optional() }).safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data).length) { res.status(400).json({ error: "Enter a valid package update" }); return; }
  res.json(UpdateAdminMonthlyDropResponse.parse(await updateDrop(idOf(req.params.id), parsed.data, req.dbUser!.id)));
}));
router.get("/admin/monthly-drop-requests", requireAdmin, guarded(async (req, res) => {
  const parsed = z.object({ dropId: z.coerce.number().int().positive(), limit: z.coerce.number().int().min(1).max(100).default(25), offset: z.coerce.number().int().min(0).max(100000).default(0) }).strict().safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request-list parameters" }); return; }
  const { dropId, limit, offset } = parsed.data;
  const [count, list] = await Promise.all([
    pool.query<{ total: number }>("SELECT COUNT(*)::int AS total FROM monthly_member_drop_requests WHERE drop_id=$1", [dropId]),
    pool.query(`SELECT r.id, r.drop_id AS "dropId", r.user_id AS "userId", r.status,
      r.requested_at AS "requestedAt", r.updated_at AS "updatedAt", u.username
      FROM monthly_member_drop_requests r LEFT JOIN users u ON u.id=r.user_id
      WHERE r.drop_id=$1 ORDER BY r.requested_at DESC, r.id DESC LIMIT $2 OFFSET $3`, [dropId, limit, offset]),
  ]);
  res.json(ListAdminMonthlyDropRequestsResponse.parse({ requests: list.rows, total: count.rows[0].total, limit, offset }));
}));
router.patch("/admin/monthly-drop-requests/:id", requireAdmin, guarded(async (req, res) => {
  const parsed = UpdateAdminMonthlyDropRequestBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose approved, declined or fulfilled" }); return; }
  res.json(UpdateAdminMonthlyDropRequestResponse.parse(await updateDropRequest(idOf(req.params.id), parsed.data.status, req.dbUser!.id)));
}));
export default router;

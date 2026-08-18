import type { Request, Response, NextFunction } from "express";

/**
 * Route-level guard: requires an authenticated user with is_admin = true.
 * Mount after clerkAuth (which attaches req.dbUser).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).dbUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!user.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Retire public comments without deleting historical records. Older clients
// receive an explicit response instead of silently writing new comments.
router.all("/studio-posts/:id/comments", (_req, res): void => {
  res.status(410).json({
    error: "Feed comments are no longer available. Message the creator directly.",
  });
});

export default router;

# AIMD community safety controls

Use this flow when recording the App Review demonstration:

1. Sign in with two creator accounts and open the Community feed.
2. On another creator’s post, activate the three-dot **Safety options** button.
3. Open **Report this post**, select a reason, optionally add context, and submit.
   The confirmation makes clear that the report is sent to AIMD staff.
4. Open the creator profile, activate **Safety options**, and choose **Block**.
   Confirm that the creator’s posts disappear from the feed and the profile’s recent
   posts are no longer shown.
5. Open Messages and try to start or send a direct message involving the blocked
   creator. The server rejects the action, so blocking cannot be bypassed by an
   older conversation or a second device.
6. As an authorized admin, open `GET /api/moderation/reports` while signed in.
   The report queue includes the reason, optional details, target, reporter, status,
   and timestamps for moderation follow-up.

Reports are stored in `content_reports`; creator blocks are stored in
`user_blocks`. The API derives reporter identity from the authenticated session,
and the staff queue is protected by the existing admin role guard.
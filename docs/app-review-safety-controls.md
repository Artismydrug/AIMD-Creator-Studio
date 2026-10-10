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
6. As an authorized admin, open `/admin` in the web app and expand the reported
   item in the safety queue. Check the reported text/media and reporter context.
7. Enter a staff note and mark the report reviewing, resolve it, or dismiss it.
   To remove a violating post/message, select Remove content and confirm the
   destructive dialog. Only that item is deleted, not an account or conversation.
   Owned uploaded media loses public access; external/shared assets are not changed.
8. Open Closed reports to inspect the reviewer, action, note, and time.
   Reports and history persist after content removal. A closed report cannot be
   changed by a stale staff action.

Reports are stored in `content_reports`; creator blocks are stored in
`user_blocks`. The API derives reporter identity from the authenticated session,
and the staff queue and decisions are protected by the existing admin role guard.
Private-message reports require participation in the relevant conversation.

The review API is `PATCH /api/moderation/reports/:id` with a required note and
action (`review`, `resolve`, `dismiss`, or `remove_content`). Decisions are stored
in `content_report_reviews`; reviewer identity comes from the session.

## Remaining launch decisions

This is a report-and-takedown workflow, not pre-publication screening. On October
10, 2026, the owner chose to keep new community posts publishing immediately and
defer staff approval/automated screening. Reporting, blocking, and staff removal
remain available. Assign staff to monitor concerns; do not describe the deferred
screening as implemented or imply that Apple has approved the updated build.

The new public policy pages are draft owner-review material. Publish the approved
web/API/schema update before testing their production links in the new iOS build.
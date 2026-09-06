---
name: SMS consent authority
description: Durable boundary between local SMS signup records and the authoritative messaging service.
---

Public SMS signups are stored locally as `pending`, but a local form submission must never be treated as confirmed consent. Only the server-side AIMD SMS/HQ adapter may send the double-opt-in message and process YES, STOP, or HELP replies.

**Why:** Marketing SMS consent must be auditable and must not be inferred from a browser action. A missing or failed provider integration must produce a clear error rather than a false success.

**How to apply:** Keep provider credentials and delivery calls on the API server. Preserve disclosure version, source, page URL, and consent timestamp. Update confirmed or opted-out status only from authoritative provider events.
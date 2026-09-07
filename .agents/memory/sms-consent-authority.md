---
name: SMS consent authority
description: Durable boundary between local SMS signup records and the authoritative messaging service.
---

Public SMS signups are stored locally as `pending`, but a local form submission must never be treated as confirmed consent. Only the server-side AIMD SMS/HQ adapter may send the double-opt-in message and process YES, STOP, or HELP replies.

**Why:** Marketing SMS consent must be auditable and must not be inferred from a browser action. A missing or failed provider integration must produce a clear error rather than a false success.

**How to apply:** Keep provider credentials and delivery calls on the API server. Preserve disclosure version, source, page URL, and consent timestamp. Update confirmed or opted-out status only from authoritative provider events.

Provider callbacks must use a configured canonical HTTPS URL, never a request-derived host. STOP is authoritative: YES may atomically confirm only a currently pending signup when the provider event is not older than that signup; HELP must not change consent.

**Why:** Provider callbacks can arrive late, duplicate, or concurrently. A delayed YES must never reverse an opt-out, and a public Host header must never redirect callback data.

**How to apply:** Authenticate callbacks server-side, require a provider event timestamp, enforce the consent transition in the database update condition, and test concurrent YES/STOP delivery.

Creator Studio may submit signups only to Operations HQ's dedicated HTTPS subscription endpoint ending in `/api/sms/subscribe`. It must never call HQ's `/api/sms/webhook`, which is reserved for Twilio-signed callbacks. HQ owns confirmation text and Twilio callback configuration, so neither belongs in the signup payload. Treat only HQ HTTP 201 as confirmation-text success.

**Why:** Sending Creator Studio requests to the Twilio callback endpoint produces authorization failures and crosses the provider boundary; accepting arbitrary 2xx responses can falsely claim that a confirmation was sent.

**How to apply:** Validate the configured subscription URL path before sending, keep the token and stable requester key server-only, send only HQ's documented signup fields, and map HQ error statuses without claiming success.
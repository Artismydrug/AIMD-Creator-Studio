---
name: Request reliability
description: Treat timed-out publishing and other writes as uncertain outcomes, not confirmed failures.
---

A timed-out write may already have committed on the server. Do not automatically replay publishing, checkout, or other non-idempotent mutations without a server-backed idempotency mechanism. Preserve the user's input and explain how to check whether the operation succeeded.

**Why:** A slow or lost response is indistinguishable from a failed write from the client's perspective. A synchronous tap lock prevents overlapping submissions in one composer, but cannot prevent duplicates across manual retries, app restarts, or multiple devices.

**How to apply:** Keep query retry policy separate from mutation retry policy. When implementing retry, store a stable operation identity server-side and make repeated requests return the original result. Do not describe a client-only tap lock as complete duplicate-post protection.

Message retry identities must also survive device-side draft persistence and app restarts. Serialize draft reads, edits, and confirmations per account/conversation. Confirmations must respect edit revisions, not just text equality.

**Why:** A person can edit a draft and restore the original text while an earlier send is pending; equal text does not mean it is still the unchanged sent draft. Unordered storage writes can also restore a draft after a successful clear.

**How to apply:** Persist the send identity before sending, reuse it for uncertain retries, and clear only the matching confirmed request and unchanged draft revision. Keep private draft text out of analytics.

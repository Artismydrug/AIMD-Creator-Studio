---
name: Tattoo booking workflow
description: Durable privacy and delivery rules for public Tattoo Studio booking requests.
---

Public tattoo clients must be able to submit without creating an account. Save the booking as the source of truth before attempting email delivery, keep reference images private, and treat email notification failure as non-fatal.

**Why:** Email delivery is not reliable enough to be the only booking record, while tattoo references and client contact details are sensitive and must not become public creator media.

**How to apply:** New booking features should preserve the Admin board as the authoritative queue, use short-lived request-bound upload authorization, and expose notification failures to admins without discarding or hiding the request.

Member-profile inquiries belong to the creator whose profile the client used, not a fixed artist or an external booking website. That assigned creator and authorized studio staff may see client details and references; other members must not.

**Why:** On October 22, 2026, the owner requested creator-specific editable inquiry forms and actionable delivery to each creator's own in-app inbox.

**How to apply:** Resolve the recipient on the server, preserve the form wording with the submitted inquiry, and keep notification creation atomic with submission. Private lead caches must be account-scoped; temporary reference links must only be issued after ownership checks.
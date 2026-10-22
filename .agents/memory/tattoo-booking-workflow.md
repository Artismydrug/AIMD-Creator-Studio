---
name: Tattoo booking workflow
description: Durable privacy and delivery rules for public Tattoo Studio booking requests.
---

Public tattoo clients must be able to submit without creating an account. Save the booking as the source of truth before attempting email delivery, keep reference images private and admin-only, and treat notification failure as non-fatal.

**Why:** Email delivery is not reliable enough to be the only booking record, while tattoo references and client contact details are sensitive and must not become public creator media.

**How to apply:** New booking features should preserve the Admin board as the authoritative queue, use short-lived request-bound upload authorization, and expose notification failures to admins without discarding or hiding the request.
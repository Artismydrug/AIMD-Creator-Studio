---
name: Tattoo booking workflow
description: Durable privacy and delivery rules for public Tattoo Studio booking requests.
---

Public clients must be able to submit a creator-specific inquiry without creating an account. Use the creator's saved service options as the allowed categories and persist the selected service label on the booking. Keep client contact details and reference images private to the receiving creator and authorized AIMD staff. Save the booking before email delivery and treat delivery failure as non-fatal.

**Why:** Each creator owns their own inquiry form and services; email can fail, and client references/contact details are sensitive rather than public portfolio media.

**How to apply:** Keep the Admin board and creator's in-app inquiry notification as durable records, use short-lived request-bound upload authorization, send email to the creator account address, and expose failures without discarding or hiding the inquiry.
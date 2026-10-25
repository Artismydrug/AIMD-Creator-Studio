---
name: SMS signup placement
description: Product decision for where the public AIMD text-list signup should live.
---

Keep the public AIMD text-list form embedded directly on the homepage. Do not require login, present it as a standalone marketing page, or add a dedicated navigation entry.

**Why:** The user explicitly prefers a low-friction homepage signup rather than sending visitors to another page or implying that an account is required.

**How to apply:** Keep the form as a homepage section. Future campaign and QR URLs should target the homepage while preserving the `source` query parameter.

Homepage deep links must wait for asynchronous content above the target to settle, not merely for the target to mount.

**Why:** The artwork gallery initially has no height, then expands when its request finishes. An earlier scroll lands at the gallery instead of the signup form once that content arrives.

**How to apply:** Coordinate the final anchor jump with gallery readiness and use immediate scrolling for direct signup links. A mount-only or smooth-scroll fix is insufficient.
---
name: Stripe catalog mirror refresh
description: Stripe mirror backfills resume from creation cursors and do not reliably refresh metadata-only product edits.
---

When a Stripe product's metadata or price availability changes, the local Stripe mirror may remain stale after an incremental backfill. Use the managed webhook when available, or sync each changed product and price entity directly before verifying API catalog output.

**Why:** The store API reads the local `stripe.products` and `stripe.prices` mirror, while Stripe catalog updates can occur without changing an entity's creation timestamp.

**How to apply:** Treat the live Stripe check and the API response as separate validations. If a metadata-only update is not reflected, use the sync library's per-entity refresh rather than repeating an incremental all-object backfill.
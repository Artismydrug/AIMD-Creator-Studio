---
name: Durable public rate limits
description: Reliability rule for throttling compliance-sensitive public actions across restarts and multiple servers.
---

Rate limits that prevent repeated compliance-sensitive messages must be claimed atomically in shared durable storage. Do not rely on process-local maps for these controls.

**Why:** In-memory cooldowns disappear on restart and are not shared by multiple API instances, allowing repeated requests to bypass the intended protection.

**How to apply:** Use a one-way requester fingerprint and the normalized destination as the shared key. Let the database atomically accept or reject a cooldown claim, and test both separate server instances and expiry.
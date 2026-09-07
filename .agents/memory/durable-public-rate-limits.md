---
name: Durable public rate limits
description: Reliability rule for throttling compliance-sensitive public actions across restarts and multiple servers.
---

Rate limits that prevent repeated compliance-sensitive messages must be claimed atomically in shared durable storage. Do not rely on process-local maps for these controls.

**Why:** In-memory cooldowns disappear on restart and are not shared by multiple API instances, allowing repeated requests to bypass the intended protection.

Pair-specific cooldowns are not enough on public messaging forms: also cap the number of distinct destinations attempted by one privacy-preserving requester fingerprint in a rolling window.

**Why:** A requester can evade a requester-and-destination cooldown by rotating through different destinations, causing unwanted messages to unrelated people.

**How to apply:** Use a one-way requester fingerprint and the normalized destination as shared keys. Let the database atomically accept or reject both pair-specific and requester-wide claims, and test separate server instances, expiry, and destination rotation.

When Operations HQ needs the same requester identity, forward the server-generated opaque fingerprint in a dedicated server-to-server header. Never accept that fingerprint from form input or recreate it in browser code, and fail closed if the server secret used to derive it is unavailable.

**Why:** A browser-supplied key can be rotated to evade limits, while exposing its derivation inputs weakens both privacy and abuse protection.

**How to apply:** Keep the derivation secret and observed request context on the API server. Enforce a narrow header character/length contract and verify that spoofed form fields are ignored.
---
name: Durable public rate limits
description: Reliability rule for throttling compliance-sensitive public actions across restarts and multiple servers.
---

Rate limits that prevent repeated compliance-sensitive messages must be claimed atomically in shared durable storage. Do not rely on process-local maps for these controls.

**Why:** In-memory cooldowns disappear on restart and are not shared by multiple API instances, allowing repeated requests to bypass the intended protection.

Pair-specific cooldowns are not enough on public messaging forms: also cap the number of distinct destinations attempted by one server-created browser-session identifier in a rolling window.

**Why:** A requester can evade a requester-and-destination cooldown by rotating through different destinations, causing unwanted messages to unrelated people.

**How to apply:** Use a random 64-character lowercase hexadecimal identifier stored in a Secure, HttpOnly, SameSite=Lax cookie and the normalized destination as shared keys. Let the database atomically accept or reject both pair-specific and requester-wide claims, and test separate server instances, expiry, and destination rotation.

When Operations HQ needs the same requester identity, forward the current server-created browser cookie value in a dedicated server-to-server header. Never accept that value from form input, local storage, deployment identity, network metadata, hostname, phone number, or a global constant.

**Why:** IP- and user-agent-derived identifiers can unintentionally group unrelated submissions behind shared infrastructure, while browser-controlled form or local-storage values are exposed to JavaScript and easier to manipulate.

**How to apply:** Generate 32 random bytes on the server when the cookie is absent or invalid, retain it for 24 hours, enforce the exact hexadecimal contract, and verify same-cookie stability, cross-cookie separation, HttpOnly protection, and ignored spoofed form fields.
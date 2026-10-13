---
name: Browser testing limits
description: Browser codec support, accepted Clerk fixture email domains, and asynchronous test-session readiness.
---

The automated Chromium browser may lack H.264 support even when a valid MP4 is served successfully. Use a VP8/WebM synthetic clip to verify media playback when that browser reports no MP4 codec support.

**Why:** On 2026-10-06, a valid H.264 MP4 arrived with HTTP 206 but produced `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`. Both baseline and High-profile H.264 capability checks returned empty strings; an equivalent VP8/WebM clip played normally.

**How to apply:** Check `canPlayType` before treating an MP4 playback failure as an app/storage bug. Do not remove MP4/MOV support or change production encoding merely to satisfy the automation browser. Native-device playback still needs its own verification.

Use unique `@example.com` addresses for programmatic Clerk sign-in fixtures, rather than `@example.test`.

**Why:** The Clerk testing helper rejected the reserved `.test` domain with HTTP 422 and `form_param_format_invalid`, while the documented `.com` example format worked.

**How to apply:** This restriction applies to programmatic Clerk test users, not local SQL-only fixtures. Keep test identities unique and override login claims as the testing guidance requires.

Wait for the actual web Clerk session to load and `/api/users/me` to return the expected QA identity before diagnosing protected routes or elevating a fixture account.

**Why:** The sign-in helper can return before Clerk bootstrap and the backend's just-in-time user provisioning finish. An early protected-route capture and exact-email lookup falsely suggested a blank route and missing user; the same session subsequently rendered correctly.

**How to apply:** Confirm loaded session state and the profile response on the intended origin, then check the matching development user. Never elevate a different cached account to bypass an absent fixture. Do not retry sign-in repeatedly merely because an early capture was blank.

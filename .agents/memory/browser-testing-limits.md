---
name: Browser testing limits
description: Video codec support and accepted email domains in programmatic Clerk test fixtures.
---

The automated Chromium browser may lack H.264 support even when a valid MP4 is served successfully. Use a VP8/WebM synthetic clip to verify media playback when that browser reports no MP4 codec support.

**Why:** On 2026-10-06, a valid H.264 MP4 arrived with HTTP 206 but produced `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`. Both baseline and High-profile H.264 capability checks returned empty strings; an equivalent VP8/WebM clip played normally.

**How to apply:** Check `canPlayType` before treating an MP4 playback failure as an app/storage bug. Do not remove MP4/MOV support or change production encoding merely to satisfy the automation browser. Native-device playback still needs its own verification.

Use unique `@example.com` addresses for programmatic Clerk sign-in fixtures, rather than `@example.test`.

**Why:** The Clerk testing helper rejected the reserved `.test` domain with HTTP 422 and `form_param_format_invalid`, while the documented `.com` example format worked.

**How to apply:** This restriction applies to programmatic Clerk test users, not local SQL-only fixtures. Keep test identities unique and override login claims as the testing guidance requires.

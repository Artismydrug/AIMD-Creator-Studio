---
name: Monitoring privacy
description: Privacy scope and interpretation of Creator Studio activation metrics
---

Keep launch monitoring limited to pseudonymous device/session activity and sanitized technical categories. Account-linked tracking, private creative content, messages, reflections and session recordings are outside the approved implementation scope.

**Why:** Creator Studio includes student reflections and private creator communication. Activation measurement does not require exposing that content or tying analytics to personal profiles.

**How to apply:** Preserve this boundary when adding events or troubleshooting. Report counts as devices/sessions, not verified unique registered members, and do not infer cross-device or cross-session retention without a separate product/privacy decision.

Release troubleshooting should show only fixed, whitelisted technical support codes locally, not raw exception messages, stacks, URLs, or arbitrary component names. Do not expand analytics collection merely to expose these local codes.

**Why:** Exceptions may contain private content. Native release minification can also remove component names, so a code needs a deterministic service-stage fallback rather than depending solely on a readable stack.

**How to apply:** Keep local diagnostics content-free and usable in signed builds. Adding any new analytics properties is a separate privacy-scoped change; passing a bundle export does not prove a native startup fault is fixed.

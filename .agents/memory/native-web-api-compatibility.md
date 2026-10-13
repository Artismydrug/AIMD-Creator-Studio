---
name: Native Web API compatibility
description: Browser and Node Web API support can mask missing React Native polyfill methods.
---

Do not assume that modern browser or Node Web APIs are available in the native app. In particular, static AbortSignal helpers may be absent even though TypeScript and browser builds accept them.

**Why:** Browser checks and bundle exports passed while the installed React Native AbortSignal implementation lacked a static timeout helper. Calling that helper during rendering reproduced a native Dashboard TypeError.

**How to apply:** Check the native implementation before relying on newer Web APIs, and run compatibility regressions against React Native's actual polyfill rather than Node's global implementation. Preserve request deadlines through the shared request client's supported timeout option; do not remove timeouts to work around platform incompatibility.

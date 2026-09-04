---
name: Clerk iPad OAuth callbacks
description: Native Clerk SSO callback, session-readiness, and error-handling requirements exposed by App Review on iPad
---

Native Clerk OAuth must build its redirect URI with the app's registered URL scheme and a stable callback path. If OAuth returns without an active session, the UI must show an actionable error rather than appearing unresponsive.

**Why:** App Review on an iPad reported Sign in with Apple as unresponsive when the callback URI relied on implicit scheme inference and incomplete OAuth results were only logged.

**How to apply:** Keep sign-in and sign-up OAuth flows aligned. After auth or routing changes, test the signed TestFlight build on iPad compatibility mode as well as iPhone, including cancel and incomplete-account cases.

Device validation: canceling the Apple sign-in sheet returns to the Creator Studio sign-in screen, confirming the cancellation path is responsive rather than silently hanging.

Protected app routes must not mount until Clerk has produced a usable bearer token for the newly active session. Show a visible preparation state, retry token creation for a bounded period, clear previous-account query state, and provide an actionable retry instead of leaving a blank or failed dashboard.

**Why:** App Review later reported that the app failed to load correctly after login on an iPad even though Sign in with Apple itself completed successfully; authenticated queries could start during the session-token handoff.

**How to apply:** Treat the auth callback and the authenticated API session as separate readiness phases. Release checks must verify both phases and cold-launch the signed TestFlight build after a fresh install.
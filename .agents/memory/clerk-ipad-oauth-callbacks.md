---
name: Clerk iPad OAuth callbacks
description: Native Clerk SSO callback and error-handling requirements exposed by App Review on iPad
---

Native Clerk OAuth must build its redirect URI with the app's registered URL scheme and a stable callback path. If OAuth returns without an active session, the UI must show an actionable error rather than appearing unresponsive.

**Why:** App Review on an iPad reported Sign in with Apple as unresponsive when the callback URI relied on implicit scheme inference and incomplete OAuth results were only logged.

**How to apply:** Keep sign-in and sign-up OAuth flows aligned. After auth or routing changes, test the signed TestFlight build on iPad compatibility mode as well as iPhone, including cancel and incomplete-account cases.
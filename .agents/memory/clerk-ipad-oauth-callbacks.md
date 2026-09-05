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

Local token availability is not sufficient readiness: the API must accept the bearer token on a lightweight protected endpoint before protected screens mount. Retry server verification with a fresh token after an initial rejection.

**Why:** Production logs from a signed iPad build showed the first protected requests returning 401 in a few milliseconds, while the same endpoints succeeded shortly afterward and the progress query itself was fast.

**How to apply:** Gate authenticated navigation on both token creation and a successful server probe. Bound token, probe, and screen-data waits so auth propagation delays never become permanent dashboard spinners.

Keep mobile API authentication continuously registered while Clerk settles after sign-in; credential-provider updates must not create an unauthenticated gap during protected navigation.

**Why:** A signed iPad build passed its authenticated server probe but briefly lost API authentication during the following render, so the first protected request burst failed while manual Retry succeeded.

**How to apply:** Scope authentication transport to the signed-in user/session lifecycle, clear it only on identity transitions, and verify production request ordering after every auth-handoff change.

Programmatic Clerk browser sessions created on Replit's shared artifact host do not transfer to Expo's separate development origin.

**Why:** A browser test could verify Expo startup but its injected Clerk session redirected through the shared host and disappeared on return, falsely resembling a native auth failure.

**How to apply:** Use browser automation for signed-out Expo startup only. Validate the authenticated native handoff with a signed TestFlight build on a physical device; do not change native auth solely because cross-origin browser injection fails.
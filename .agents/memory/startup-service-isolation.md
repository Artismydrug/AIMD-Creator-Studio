---
name: Startup service isolation
description: Optional startup failures must not block core use; critical access checks stay fail-closed.
---

Optional notification startup is not a prerequisite for using Creator Studio. Contain its failures, show a clear warning, and offer an explicit retry instead of replacing the entire app with an error screen.

**Why:** Notifications are optional support for habits and communication. A failure in that service should not deny access to the rest of the app. This is a containment decision, not evidence that notifications caused any particular native crash.

**How to apply:** Isolate optional startup services while preserving visible failure and recovery. Never bypass authentication readiness, account isolation, or workshop entitlements as a recovery shortcut.

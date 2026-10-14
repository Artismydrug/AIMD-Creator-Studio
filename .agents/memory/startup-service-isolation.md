---
name: Startup service isolation
description: Optional startup failures must not block core use; critical access checks stay fail-closed.
---

Optional notification startup is not a prerequisite for using Creator Studio. Contain its failures, show a clear warning, and offer an explicit retry instead of replacing the entire app with an error screen.

**Why:** Notifications are optional support for habits and communication. A failure in that service should not deny access to the rest of the app. This is a containment decision, not evidence that notifications caused any particular native crash.

**How to apply:** Isolate optional startup services while preserving visible failure and recovery. Never bypass authentication readiness, account isolation, or workshop entitlements as a recovery shortcut.

Start optional native monitoring only after navigation has mounted, with cancellable deferred startup and lazy SDK loading. Keep the shared startup attempt idempotent and contain SDK import, constructor, readiness, and error-hook failures.

**Why:** A root layout's first effect can run while fonts or account preparation still prevent the navigation tree from rendering. Merely moving startup into that effect does not isolate monitoring from cold boot.

**How to apply:** Keep monitoring outside critical readiness gates. Preserve native crash handling and content-free privacy filters; missing early analytics must not block sign-in or navigation. This isolation does not establish that monitoring caused a device crash.

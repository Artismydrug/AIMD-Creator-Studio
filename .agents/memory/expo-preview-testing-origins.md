---
name: Expo preview testing origins
description: Signed-in browser checks must target the Expo preview origin rather than the sibling website.
---

Do not assume a programmatic tester login on the sibling website also authenticates the Expo preview.

**Why:** The test login helper authenticated the default web origin, while the Expo app used a separate preview origin and remained signed out. The shared-origin mobile proxy returned HTML successfully but its browser resources failed under the prefixed route.

**How to apply:** Establish client sign-in and a successful current-user API response on the intended Expo origin before testing protected screens or seeding records. HTTP 200 for the HTML alone is not sufficient. If the helper cannot target that origin, report the signed-in verification limitation rather than modifying working app authentication to fit the test tool.

Static Expo preview captures can intermittently be white even when browser logs show the sign-in form mounted.

**Why:** A later capture rendered the sign-in page without any code change; other captures remained white despite password-field DOM logs. The cause was not established, so this is not evidence of a native TestFlight failure.

**How to apply:** Distinguish static-capture limitations from reproducible app failures. Do not claim native or signed-in verification from a public preview screenshot.
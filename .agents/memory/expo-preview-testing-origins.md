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

Mocked Expo booking tests must intercept the API host as well as the Expo preview origin, and block unmatched booking writes rather than allowing them to reach the server.

**Why:** A browser test intercepted a draft response but missed its subsequent private-reference request on the API origin, producing an invalid-token response and an inconclusive retry test. A context-wide, any-host handler with explicit preflight handling isolated the flow correctly.

**How to apply:** Install interception before opening the page, verify a mock-response marker, keep counters outside the browser page, and abort unhandled writes under the tested endpoint family. Do not mistake a partially mocked authorization failure for a product defect.

Android Expo Go on SDK 53+ does not support remote push notifications. Preview startup must not register remote push listeners or initialize unsupported notification flows.

**Why:** An Android Expo Go preview raised a fatal `expo-notifications` error before the app opened because notification APIs were initialized during startup.

**How to apply:** Detect Android Expo Go using `Constants.executionEnvironment === 'storeClient'`; skip remote push initialization and guard any notification setup that blocks preview startup. Keep the production/dev-build notification path intact, and test push delivery in an installed build.
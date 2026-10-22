# Lean v1 scope

## Primary journey

Habits (landing) → Learn → Feed → Studio.

Studio retains portfolio editing, artwork categories, new work, creator-specific inquiry forms, the notification inbox, and account settings. Community retains creator discovery and events. Learning portfolio, safety tools, account deletion, and legal/help routes remain available.

## Deferred, not deleted

`lib/launchFeatures.ts` controls the legacy dashboard (including its wheel, duplicate badge previews, and duplicate progress cards), separate challenges, Side Quest, and member drops. `withLaunchFeature` redirects existing deep links to Habits or Studio **before** mounting a deferred component's hooks, requests, or media controls.

No tables, awards, points, saved sketches, posts, inquiries, or member records were deleted. Core Monthly Streak progress and bonus logic are unchanged. One earned-history link lives in Edit Profile.

The unreferenced Pro Ecosystem referral component was removed. Nine direct dependencies with no source/config/shared-library references were removed; supported Expo/React/Metro tooling remains.

## Checks

- TypeScript compilation checks all source files, including deferred implementations.
- `pnpm --filter @workspace/aimd-network run check:release` includes the primary-navigation and v1-scope checks.
- The scope checks execute redirect gates, verify hidden entry points, retain habit/inquiry controls, and audit literal navigation links against actual Expo routes.
- `expo export --platform all` validates iOS, Android, and web JavaScript bundles and asset manifests. This is not a signed native binary or an App Store upload.

## Remaining release validation

Signed-in visual verification is limited by the test login helper using the sibling web origin rather than the Expo preview origin. A native device/TestFlight pass remains necessary; JavaScript export success cannot guarantee store approval or native runtime behavior.

Expo currently recommends expo-asset 12.0.14. The workspace's release-age policy does not yet allow that patch, so the existing 12.0.13 was retained rather than bypassing the policy or changing SDK major versions.

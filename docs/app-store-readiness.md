# Creator Studio by AIMD — App Store readiness audit

**Reviewed:** October 12, 2026

**Scope:** Mobile source/configuration, release dependencies, selected backend protections, public production endpoints, and Apple review requirements.  
**Approval update:** The owner provided an App Store Connect screenshot showing iOS version 1.0.0 (build 10) approved and review completed. The earlier recommendation to withhold submission was too categorical.

This audit concerns the current workspace. It does not establish that the approved binary contains the same code or the same gaps. These findings are follow-up priorities and checks for future updates—not Apple rejection findings or proof that the already approved version must redo review. Approval alone does not establish public release availability.

**Release-plan clarification:** The owner confirmed the approved build has not been released. The intended soft launch will use an improved build submitted for a fresh Apple review after testing and fixes. For this new candidate, the recommendation is to close the essential current-code issues and validate a production-configured native build before resubmission—not to release the earlier approved build or implement every optional enhancement.

## October 12 final candidate audit

**Release gate:** Do not submit the older TestFlight build 11 as evidence of these workspace fixes. Publish the current backend and create, install, and check a fresh production-configured native candidate before choosing a build for Apple review. No deployment or native upload was performed during this audit.

### Verified

- Mobile and API TypeScript checks passed.
- The complete API suite passed: **335 tests across 37 files**.
- Mobile request-safety checks passed: **25 tests**, including text-only reading, embedded viewport measurement, messaging safeguards, and four non-enrollable workshop previews.
- Account deletion, auth handoff, dashboard, HQ loading, and release-content source smoke checks passed.
- Expo dependency compatibility passed. No dependency versions changed during this audit.
- The updated **iOS JavaScript export** and production **API server build** completed successfully. The export is not a signed IPA or a production-configured TestFlight installation.
- Both top-level and iOS icon configuration point to approved option 14: an opaque 1024×1024 image. Physical installation remains the final icon check.
- Signed-in development browser checks at 390×844 covered the tour, photo-backed habit completion and reload persistence, four coming-soon workshop previews, short/long text posts, All versus Following, test-to-test messaging and persistence, dark appearance, safety-menu availability, and public Terms/Privacy pages.
- Browser account cancellation preserved the account, posts, habit, and practice log after reload, with **zero DELETE requests**. Explicit confirmation produced one deletion request, removed test-owned app data and proof media, and signed the session out. No real account was deleted. External provider identity records were not independently inspected.

### Corrections made

- Replaced unsupported browser account-deletion alerts with an explicit app-owned confirmation panel. Cancel only closes the panel; the destructive button submits deletion. Native iPhone/Android confirmation remains separate. Added a synchronous in-flight guard.
- Made the frosted bottom bar participate in layout instead of covering content.
- Added direct scroll-host measurement plus scroll/layout event synchronization. Embedded feed cards must match the visible pager rather than retain an estimated full-screen height.
- Final feed bounds verification remains **unverified**: after fixture cleanup, the test helper authenticated the sibling web app rather than the dedicated Expo host. The tester did not substitute that different feed as evidence. Current mobile types, regression contracts, and iOS export pass, but the sizing correction must be checked in the new native candidate.

### Production and phone checks still required

The live server at `https://artismydrug.com` responded successfully to readiness and legal-page checks, but it still returned HTTP 200 for the retired public comments endpoint. The workspace returns HTTP 410 for that endpoint. **The production backend is not yet synchronized with the current source.** Publishing it is required for the latest feed and interaction behavior.

After publishing the backend, install the fresh native candidate and check:

1. Build identity and option 14 on the actual home screen/TestFlight installation.
2. Real sign-in/sign-out, four workshop examples, and community All/Following behavior against production.
3. Message composer with the iPhone keyboard open; send and reopen a thread.
4. Photo/audio selection, upload, and playback; long writing and feed swipe behavior.
5. Habit reminder delivery while the app is closed and cancellation/deletion using a disposable account—not the owner's account.

App Store metadata, reviewer access, privacy declarations, and the selected review binary must still be checked in App Store Connect. Browser and source checks do not guarantee Apple approval, native behavior, or arbitrary production concurrency.

## October 10 baseline (historical)

## Fixed during the audit

The mobile package did not directly install `expo-asset`, a required native peer of `expo-audio`. Expo Doctor warned that the app could fail outside Expo Go. Added the SDK-compatible dependency and its Expo configuration plugin.

No bundle identifier, account settings, subscription catalog, production records, or membership rollout policy were changed. No app was published.

## Confirmed checks

| Check | Result | What it does not prove |
| --- | --- | --- |
| Expo SDK dependency compatibility | Passed | Actual iPhone behavior |
| Expo Doctor after the fix | 18/18 passed | Apple review approval or an Xcode archive |
| Mobile and API TypeScript checks | Passed | End-to-end UI behavior |
| Account deletion, auth handoff, dashboard, and HQ smoke contracts | All four passed | These are source-contract checks, not device-driven tests |
| Selected backend regression tests | 12 passed across account deletion, social profiles, and lesson reflections | The complete app, billing, moderation, or native UI |
| iOS JavaScript/Hermes export | Passed; 1,825 modules bundled | Not an IPA, signed native build, or TestFlight installation |
| App icon | 1024×1024 opaque PNG configured | Final rendered App Store artwork and screenshots |
| iOS config introspection | Camera/photo/microphone purpose strings, app callback schemes, Apple sign-in entitlement present | Production OAuth providers and actual device permission behavior |
| Deployment metadata | Public deployment with successful build at `https://artismydrug.com` | Health of every protected production flow |
| Public production API | Health, workshop list, and event list returned HTTP 200 | Authenticated enrollment, media playback, or content authenticity |
| RevenueCat configuration | iOS and preview SDK configuration exists | App Store products, entitlement sync, sandbox purchases, or restoration |

The iOS export used workspace development configuration. It must not be uploaded as a production release configuration.

## High-priority follow-ups for the current code

### 1. Publish real, publicly accessible Terms and complete the policy review

**Fixed in development after the audit:** `/terms` and `/support` now load publicly without sign-in. Privacy, Terms, and Help links are present on mobile sign-in, sign-up, and Profile screens. Privacy disclosures include audio, microphone use, messages, private learning reflections, and purchase providers. Account deletion copy no longer promises removal of every retained record or incorrectly claims an account remains active when completion cannot be confirmed.

**Required next:**

- Have the owner approve the draft Terms/Community Standards and updated privacy wording before publishing; these are general drafts, not attorney-reviewed legal advice.
- Check the production page anonymously, not only its HTTP status.
- Publish the web/API update through the normal Publish flow, including the development database schema diff. No production migration script or new startup migration was added.
- Verify the mobile links in the new signed native build against the published pages.

**Relevant sources:** `artifacts/aimd-network/app/membership.tsx`, `artifacts/aimd-network/app/profile.tsx`, `artifacts/aimd-academy/src/App.tsx`, `artifacts/aimd-academy/src/pages/Privacy.tsx`, `artifacts/api-server/src/lib/accountDeletion.ts`.

### 2. Complete the community moderation process

**Implemented in development:** Creator/post/message reporting, server-owned identity, blocking, admin-only review UI at `/admin`, required staff decision notes, review history, resolve/dismiss actions, and confirmed takedown of an individual reported post or message. Reports remain available after takedown. Owned uploaded media loses public access; shared/external assets are not modified. No account or entire conversation is deleted by a takedown.

**Remaining gaps and completed repairs:**

- The post creation route publishes valid submissions directly; no objectionable-content screening or pre-publication moderation step was found.
- Repaired the report target constraint: a post/message owner is no longer incorrectly counted as a second report target.
- Private-message reports now require conversation participation, including for staff submitting a report.
- Non-admin review is forbidden; closed reports reject stale actions. Media withdrawal failure rolls back the database takedown/review.

**Required next:**

- **Owner decision, October 10, 2026:** keep community posts publishing immediately for now. Staff approval and automated pre-publication screening are deferred. This does not establish that filtering requirements are satisfied or guarantee acceptance of the updated build.
- Define who monitors reports and how quickly concerns are handled.
- Verify that blocks work across feed, profile, and messaging, including already-open conversations.

**Verification of these repairs:** shared-library, mobile, web, and API type checks passed; 22 regression tests passed across moderation, owned-media withdrawal, account deletion, and social profiles. Mobile account-deletion smoke contract passed. Public Terms rendered anonymously. Staff browser verification is recorded separately below when completed. These checks do not constitute Apple approval or native TestFlight testing.

**Staff browser verification completed:** a disposable Clerk-authenticated admin reviewed a report, canceled a removal without deleting content, confirmed the removal, and inspected persisted closed-report history after reload. Demoting that disposable account immediately produced 403 for list/review APIs. All disposable data was cleaned up; existing users/content were untouched.

**Public/preview checks:** Terms rendered on desktop and Support rendered on a narrow phone viewport without sign-in. The Expo screenshot was still in its account-session initialization screen, so it did not visually verify the new mobile footer. Mobile type checks and the account-deletion contract passed, but the new native build still requires device verification.

Apple guideline 1.2 requires filtering, reporting with timely responses, blocking, and published contact information. Persisting a report alone is not the whole moderation process.

**Relevant sources:** `docs/app-review-safety-controls.md`, `artifacts/aimd-network/components/SafetyActions.tsx`, `artifacts/api-server/src/routes/moderation.ts`, `artifacts/api-server/src/routes/studio-posts.ts`, the existing conversations routes, `artifacts/aimd-academy/src/pages/Admin.tsx`.

### 3. Decide and enforce the age/content policy

**Confirmed in the inspected app paths:** No in-app age declaration, age restriction, or age-rated content control was found. The product is being discussed for schools and students, making this a product decision rather than a checkbox.

**Required next:**

- Decide the minimum launch age and whether minors can create accounts and interact publicly.
- Match App Store age-rating answers to actual user-generated art, audio, video, and messaging.
- Apply appropriate declared/verified-age restrictions and a way to identify content above the app’s rating.
- Separately scope any younger-child or school-managed use, parental/school consent, instructor access, and contact safeguards.

Do not silently default to an adult-only launch or claim school/child compliance without the owner's decision. Apple creator-app guideline 1.2.1(a) addresses age restrictions and content beyond an app's age rating.

### 4. Test the next updated native build

This audit did not install or drive a new signed iOS build. The earlier signed-in mobile preview check was also blocked by the preview/auth testing setup. Before distributing the current workspace changes, verify the updated native build; this is not a request to repeat the already completed Apple approval.

Use a fresh build through the managed iOS publishing flow and test:

- Cold launch; email signup/verification; Google and Apple sign-in; password reset; logout and sign-in again.
- Production backend domain, production auth configuration, OAuth callback return, and session recovery after backgrounding.
- Habit creation, edit/delete, photo proof, check-in, streaks, and the four-week flame graph.
- Photo/video/audio post creation, interrupted or failed upload, playback, and deleting one's own post.
- Camera, microphone, and photo-library permission denial and later recovery.
- Feed/profile/message reports and blocking.
- Workshop access, enrollment, released-video playback, reflection saving/reload, and private instructor feedback.
- Account deletion from a disposable account; confirm the auth identity and personal content are actually removed.
- Purchase restoration for an existing member. Keep new paid checkout unavailable during the agreed free-launch phase.
- Small-screen layout, large text, VoiceOver labels, dark/light mode, poor connectivity, and retry states.

Expo Go cannot establish native purchase readiness. For a future paid rollout, separately test App Store sandbox purchase/cancellation/restoration and server entitlement synchronization.

## App Store Connect items not verifiable from this workspace

- Correct category, age-rating questionnaire, privacy data labels, content rights, support URL, and privacy-policy URL.
- Current screenshots matching the AIMD icon and the actual released UI.
- Accurate listing copy: do not imply filmed workshops, Canvas/grade syncing, native live streaming, or an instructor mobile inbox are available when they are not.
- An active review account or supported review mode, instructions for protected features, and any enrolled workshop access the reviewer needs. Never put review credentials in project documentation.
- Final native privacy manifests/required-reason declarations and any Apple build validation warnings.
- Apple Developer/App Store Connect agreements and the release/build number accepted for the next upload.

## Lower-priority hardening and product readiness

- The generated iOS configuration currently allows arbitrary network loads and contains generic location purpose descriptions. The inspected app traffic uses HTTPS, and no location-request feature was found. Review/minimize those declarations; do not label them a confirmed runtime failure.
- Paid membership stays unavailable to new subscribers as agreed; current-member access and restore controls remain.
- Before promoting workshops, verify real released lessons/teasers and real event dates, locations, and capacities. Public list responses alone do not establish that media exists or that event entries are launch-approved.
- Instructor reflection review exists on the web. A role-specific mobile instructor home and lesson question/comment inbox are separate product updates, not features built by this audit.
- Native live streaming remains deferred. It is not required for the free soft launch.

## Recommended order

1. Public legal/help pages and policy approval.
2. Moderation screening, staff resolution/takedown, and age-policy safeguards.
3. App Store metadata/disclosures plus a fresh production-configured TestFlight pass.
4. For future updates, validate the changed flows before submission. Do not assume the already approved binary contains new workspace fixes. Prioritize confirmed bugs and safety work over adding instructor features.

## Official references consulted

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — particularly 1.2 and 1.2.1(a); review current privacy, account deletion, login, and subscription provisions before submission.
- [Replit: Upload your app to App Store Connect](https://docs.replit.com/build/mobile-upload-ios)
- [Replit: Beta test with TestFlight](https://docs.replit.com/build/mobile-testflight)
- [Replit: Preview and test on your phone](https://docs.replit.com/build/mobile-preview-testing)

# Creator Studio by AIMD — App Store readiness audit

**Reviewed:** October 10, 2026  
**Scope:** Mobile source/configuration, release dependencies, selected backend protections, public production endpoints, and Apple review requirements.  
**Decision:** Continue controlled testing; do not treat this audit as approval to submit the public App Store release.

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

## High-priority launch gates

### 1. Publish real, publicly accessible Terms and complete the policy review

**Confirmed:** The mobile membership screen links to `https://artismydrug.com/terms`, but the web router has no public `/terms` page. An anonymous preview of that route displays sign-in instead of Terms. HTTP 200 from the SPA was not evidence of a valid legal page.

**Required next:**

- Provide an actual public Terms/Community Standards page and have the owner approve its terms.
- Check the production page anonymously, not only its HTTP status.
- Put easy-to-find Privacy, Terms, and support links in the normal mobile account/help experience.
- Review privacy disclosures against current audio uploads, microphone use, direct messages, private learning reflections, purchases/RevenueCat, and retention behavior.
- Reconcile deletion copy stating “all associated data” with legitimate retained/anonymized records. Do not promise more deletion than the system performs.
- Use the existing published contact address, not an invented support address.

**Relevant sources:** `artifacts/aimd-network/app/membership.tsx`, `artifacts/aimd-network/app/profile.tsx`, `artifacts/aimd-academy/src/App.tsx`, `artifacts/aimd-academy/src/pages/Privacy.tsx`, `artifacts/api-server/src/lib/accountDeletion.ts`.

### 2. Complete the community moderation process

**Already present:** Creator/post/message reporting, server-owned reporter identity, blocking, and an admin-protected report-list API. An existing demonstration checklist covers those controls.

**Gaps found:**

- The post creation route publishes valid submissions directly; no objectionable-content screening or pre-publication moderation step was found.
- Reports can be created/listed, but no staff report-resolution endpoint or report review/removal UI was found.
- The ordinary post-delete endpoint only allows the post owner to delete it; it is not a staff takedown workflow.
- Private-message reporting checks that a message exists, but does not verify that the reporter participates in that conversation.

**Required next:**

- Choose and implement a proportionate screening/review policy covering text and uploaded photo/video/audio content, not only file-type validation.
- Give authorized staff a usable queue, safe removal/restriction actions, status tracking, and an auditable resolution path.
- Define who monitors reports and how quickly concerns are handled.
- Require conversation participation for private-message reports.
- Verify that blocks work across feed, profile, and messaging, including already-open conversations.

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

### 4. Finish a production-configured native TestFlight pass

This audit did not install or drive a new signed iOS build. The earlier signed-in mobile preview check was also blocked by the preview/auth testing setup. Native verification remains a release gate.

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
4. Submit only after the launch gates pass. Add new instructor features after the core launch risks are resolved.

## Official references consulted

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — particularly 1.2 and 1.2.1(a); review current privacy, account deletion, login, and subscription provisions before submission.
- [Replit: Upload your app to App Store Connect](https://docs.replit.com/build/mobile-upload-ios)
- [Replit: Beta test with TestFlight](https://docs.replit.com/build/mobile-testflight)
- [Replit: Preview and test on your phone](https://docs.replit.com/build/mobile-preview-testing)

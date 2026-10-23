---
name: App Store approval context
description: Distinguish the already approved iOS release from current workspace audits and future updates.
---

The owner provided App Store Connect evidence on October 10, 2026 showing that an iOS app release had been approved and its review completed.

The owner clarified that the approved build was intentionally held unreleased while collecting tester feedback. Their stated soft-launch approach is to submit an improved build for a fresh review before public release, not to launch the earlier approved build simply because approval exists.

**Why:** A workspace readiness audit was initially described too categorically as a reason not to submit, without knowing that Apple had already approved a release.

**How to apply:** Do not describe Creator Studio as awaiting its initial Apple approval. Separate confirmed current-code issues, unverified native behavior, and future-update recommendations from the previously approved binary. Approval is not proof of public availability or proof that subsequent workspace changes were reviewed; check current release status when needed.

When discussing readiness, assess the updated release candidate against this launch approach. Do not recommend releasing the earlier approved build unless the owner changes the plan.

A successful source check or JavaScript export does not prove that the latest UI and icon were packaged into an uploaded or installed native build.

**Why:** The approved icon was correct in the workspace, but TestFlight showed older artwork; the tester recording also lacked workshop preview cards present in current source.

**How to apply:** Distinguish the available TestFlight build from the installed build, especially when an Update button is visible. Verify exported manifests and bundle content, then require a fresh native upload and device checks before declaring the release candidate ready.

Treat a mismatch involving several retired UI features as a release-identity problem before changing the live design.

**Why:** Repeated tester recordings have shown older native UI despite passing workspace checks. A web/backend republish is not evidence that an installed TestFlight binary changed.

**How to apply:** Compare the installed native build number and expected feature markers with the freshly exported bundle, then verify the next native upload through TestFlight Update. Avoid uninstalling to refresh; creators may have device-local sketches.

Match release validation to the artifact format generated in the current run. A fresh static Expo Go build does not refresh a separate native Expo export.

**Why:** A preview build contained the current UI while a leftover native export still lacked current Dashboard markers. Validating the wrong output gave a misleading stale-build result.

**How to apply:** Establish output freshness and format before inspecting bundles. Treat a successful preview export as preview evidence only, not proof of the signed App Store binary or the installed TestFlight version.

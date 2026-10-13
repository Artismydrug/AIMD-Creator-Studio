---
name: Native push readiness
description: Managed publishing identifiers and the limits of browser/provider push verification.
---

Do not infer that a native app needs manual EAS setup solely because its source or web preview lacks an EAS project ID. Replit’s guided mobile publishing flow manages build identifiers; inspect the installed build’s runtime configuration before prescribing manual configuration.

**Why:** Source-only inspection initially suggested a missing Expo project required manual EAS setup, but Replit’s official mobile publishing guidance directs users through its managed build flow rather than EAS CLI.

**How to apply:** Resolve identifiers from Expo runtime configuration, fail clearly if device registration cannot complete, and use the guided mobile publish flow. Consult current Replit documentation before changing this approach: https://docs.replit.com/build/mobile-push-notifications.

An API test or accepted Expo push ticket is not proof of a delivered phone notification.

**Why:** Native provisioning, provider credentials, OS permission, notification channels, and Focus settings all affect delivery beyond what a web browser or mocked provider response can verify.

**How to apply:** Verify a real triggering action from a second account with the recipient’s TestFlight app closed, confirm lock-screen delivery, then test notification tap routing. Keep delivery marked unverified until that device check succeeds.

---
name: Browser destructive confirmations
description: Explicit confirmation controls for destructive actions in Expo web previews.
---

Use app-owned confirmation controls for destructive browser actions. Opening a confirmation or choosing Cancel must never submit a mutation. Preserve native platform confirmations separately.

**Why:** React Native Web does not implement native Alert buttons. A release test also failed to reliably honor dismissal of a browser-native confirmation, so browser-dialog interception is not a dependable foundation for verifying destructive cancellation.

**How to apply:** Give Cancel and Confirm distinct controls, invoke the mutation only from Confirm, and verify that cancellation sends no write request and preserves data after reload. Browser success does not replace a native-device deletion check.

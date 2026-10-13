---
name: Habit reminder policy
description: Device-local reminder scope and reliability decisions.
---

Habit reminders are optional daily local-time alerts, not an SMS or paid remote-push service. Settings belong to a device and signed-in account; do not imply they sync across devices.

**Why:** The owner requested user-set habit alerts, such as “8am start sketching.” Device scheduling supports that use case without adding a messaging provider or recurring delivery costs.

**How to apply:** Ask permission only when a user saves an alert or explicitly resumes already-configured alerts. A master pause must keep the saved habit times and messages. Preserve valid scheduled alerts when a refresh cannot reach the server. Pause alerts on sign-out and isolate accounts on shared devices. New native notification dependencies need a fresh app binary and actual device-delivery checks before resubmission.

---
name: Embedded motion accessibility
description: Accessibility rule for animated explainers embedded in public web pages.
---

Embedded, continuously looping explainers must provide a persistently visible pause/play control with at least a 44×44px touch target, plus a complete static presentation when `prefers-reduced-motion` is enabled.

**Why:** A control that only appears on hover or keyboard focus is undiscoverable on touch devices, and a looping animation without a reduced-motion path blocks release even when the motion itself renders correctly.

**How to apply:** Treat standalone motion-artifact “no interactivity” guidance separately from public-page accessibility. For embedded explainers, keep one accessible transcript, hide duplicate animated text from assistive technology, and verify pause/resume and reduced-motion behavior at phone widths.
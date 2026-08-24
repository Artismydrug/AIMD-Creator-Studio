---
name: Embedded motion accessibility
description: Accessibility rule for animated explainers embedded in public web pages.
---

Preserve approved Creator App explainer graphics when changing its interaction. The explainer is a manual slideshow, not an autoplaying video: use persistent Previous/Next controls with touch-friendly targets and a complete static presentation when `prefers-reduced-motion` is enabled.

**Why:** The product owner explicitly prefers the original Creator App visual sequence and does not want a replacement promo layout or video-style play/pause/replay controls. Controls that only appear on hover or keyboard focus are undiscoverable on touch devices.

**How to apply:** Treat standalone motion-artifact “no interactivity” guidance separately from public-page accessibility. For embedded explainers, keep one accessible transcript, hide duplicate animated text from assistive technology, and verify manual navigation and reduced-motion behavior at phone widths.
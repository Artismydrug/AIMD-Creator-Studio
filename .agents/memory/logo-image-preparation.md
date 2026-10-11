---
name: Logo image preparation
description: Avoid subtle panel borders when adapting supplied raster logos for app icons.
---

When adapting a supplied raster logo, preserve its actual letter shapes but isolate the mark from the image's background panel before placing it on a new icon canvas. Automatic trimming is not proof that all outer-border pixels are gone.

**Why:** The supplied AIMD JPEG had a near-black panel and a faint bright edge. Both survived initial automatic trimming and became visible as a rectangular seam or stray line in the icon.

**How to apply:** Inspect the isolated mark and the final composite at full and small sizes. Check opaque output for iOS and appropriate mask-safe spacing for Android; avoid AI redrawing of an existing brand mark.

Transparent cutout versions of the AIMD logo can appear as faint outlines in a dark image preview. Composite against a light backing to interpret the intended white-on-black wordmark before adapting it; do not mistake the preview for an outline redesign.

**Why:** The supplied original PNG used transparent letter cutouts in the black panel. A dark preview hid the letters even though the intended mark matched the original branding.

## Creator Studio app-icon lockup
Use the authentic AIMD wordmark with “Creator Studio” beneath it, replacing the previous “Art is my drug” descriptor. Keep the iOS wordmark and Android adaptive version visually consistent while respecting Android’s mask-safe area.

**Why:** The user explicitly chose “Creator Studio” as the descriptor on the Creator Studio app icon.

**How to apply:** Preserve the original wordmark geometry; check the title at home-screen size and the Android version under its adaptive mask before a native release build.

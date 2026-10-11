---
name: Logo image preparation
description: Preserve the AIMD black-box lockup and inspect transparency when adapting the logo.
---

When adapting the AIMD logo for the app icon, preserve its actual letter shapes and intentional black rectangular panel. Place that panel on a contrasting background, rather than a black canvas that hides the box. Remove only stray raster-edge seams, not the panel itself. The requested icon palette is now purple and orange with creative paint effects, superseding the cream-background version; this is an icon direction, not a request to recolor the entire app.

**Why:** The user explicitly corrected the icon to retain the original black box around AIMD, then requested a purple-and-orange scheme with creative effects. A previous black canvas hid this defining brand feature. Supplied raster files can also contain faint edge pixels that need cleaning.

**How to apply:** Inspect the boxed mark and final composite at full and small sizes. Check opaque output for iOS and appropriate mask-safe spacing for Android; avoid AI redrawing of an existing brand mark.

Transparent cutout versions of the AIMD logo can appear as faint outlines in a dark image preview. Composite against a light backing to interpret the intended white-on-black wordmark before adapting it; do not mistake the preview for an outline redesign.

**Why:** The supplied original PNG used transparent letter cutouts in the black panel. A dark preview hid the letters even though the intended mark matched the original branding.

## Creator Studio app-icon lockup
Use the authentic AIMD wordmark with “Creator Studio” beneath it, replacing the previous “Art is my drug” descriptor. Keep the iOS wordmark and Android adaptive version visually consistent while respecting Android’s mask-safe area.

**Why:** The user explicitly chose “Creator Studio” as the descriptor on the Creator Studio app icon.

**How to apply:** Preserve the original wordmark geometry; check the title at home-screen size and the Android version under its adaptive mask before a native release build.

---
name: Metro multi-artifact startup
description: Keep mobile development watchers independent of unrelated artifact builds.
---

Do not expand the mobile watch scope to unrelated sibling artifacts when adding new decks or apps. Preserve shared libraries and pnpm dependency visibility.

**Why:** Expo's automatic workspace discovery included every sibling artifact. The mobile preview failed to start watch mode despite passing all Expo dependency checks. Excluding unrelated sibling apps and generated mobile bundles restored startup and a rendered sign-in screen.

**How to apply:** For future startup or module-resolution issues, check the watched workspace scope before changing dependencies or ports. Shared code belongs in workspace libraries rather than imports between artifacts; keep those libraries visible to Metro.

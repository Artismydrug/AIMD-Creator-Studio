---
name: Verification resource budget
description: Avoid confusing build-resource contention with media test failures during launch verification.
---

Run full workspace builds and native bundle exports separately from media-heavy backend tests.

**Why:** Concurrent compilation and media processing caused backend tests to exceed their deadlines; the same full test suite passed unchanged once the build finished.

**How to apply:** Parallelize lightweight checks, but schedule the complete backend media suite after native exports finish. Treat a timeout as a possible defect until an isolated run confirms resource contention; do not hide it by widening timeouts automatically.

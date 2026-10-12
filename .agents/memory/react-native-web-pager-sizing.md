---
name: React Native feed paging
description: Viewport sizing and nested writing-scroll constraints for native and React Native Web feeds.
---

Viewport-sized FlatList rows must have explicit height, matching min/max height, and `flexShrink: 0`; relying on `flex: 1` can compress every rendered row into the visible web viewport.

**Why:** A vertical feed passed TypeScript checks but React Native Web shrank two supposedly full-height rows so both appeared at once and snap paging never advanced.

**How to apply:** For any vertical one-item pager, measure the pager viewport, use that value for row height and snap offsets, disable row shrinking, and verify the actual scroll node at a mobile web viewport.

Nested writing readers should enable their own vertical scrolling only when the rendered writing exceeds their available viewport. Keep creator details outside that scrolling viewport.

**Why:** An always-scrollable inner reader competes with the outer feed's vertical paging gesture even for short posts. Reserving actual layout space for creator details avoids covering the end of long writing.

**How to apply:** Use rendered measurements rather than caption length, since device width and accessibility font size affect wrapping. Browser checks do not replace native TestFlight verification of nested gestures.

Do not assume a wrapper's layout callback has supplied an embedded pager's height. Measure the actual scroll host after its data mounts, and keep row height and snap offsets synchronized with the visible viewport.

**Why:** Release checks found a correctly sized scroll viewport whose rows still retained a full-window estimate because the wrapper callback was missed. Creator details can remain off-screen even when reading and global header controls appear to work.

**How to apply:** Compare actual row and viewport bounds, and inspect the per-post author footer and Message label above the bottom bar—not just the global profile button. Bottom navigation must reserve its occupied layout space.
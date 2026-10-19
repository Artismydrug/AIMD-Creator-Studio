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

Studio Feed photos and videos should share a 9:16 portrait presentation, with the composer showing the same centered crop. Keep writing and audio in their dedicated layouts; do not require creators to delete or overwrite their original files.

**Why:** The owner requested Instagram/TikTok-like portrait media and consistent feed alignment after seeing empty bands and mismatched media framing.

**How to apply:** Fit the portrait stage inside the measured pager and preserve its row snapping when safe areas or viewport dimensions change. Distinguish display framing from the original video file's encoded dimensions.

Fixed-size media frames must use explicit flex longhands with an automatic basis rather than `flex: 0`.

**Why:** React Native Web passes `flex: 0` through to CSS, where it means a zero-percent basis. In a column layout this overrides an explicit frame height, clips all absolutely positioned media/creator controls, and makes a populated feed look empty. Native and browser flex shorthand behavior differs.

**How to apply:** Use `flexGrow: 0`, `flexShrink: 0`, and `flexBasis: 'auto'` alongside measured frame dimensions. A successful API response or TypeScript check does not establish that the frame has nonzero rendered bounds.

Open the Feed area with the original Feed/Creators/Events section tabs visible, collapse the expanded header while swiping down through posts, and restore it as the user scrolls back up. Keep the compact feed controls available.

**Why:** The owner requested the original tab presentation back while retaining the larger, unobstructed post experience during scrolling. This supersedes the earlier compact-by-default preference.

**How to apply:** Overlay navigation without changing pager height as its direction state changes. Preserve safe-area spacing, the three Feed/Creators/Events destinations, and measured header clearance for writing and media controls.
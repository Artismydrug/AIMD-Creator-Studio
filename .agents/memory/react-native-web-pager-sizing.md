---
name: React Native web pager sizing
description: A layout constraint for one-item-per-screen FlatList pagers that must behave consistently on native and React Native Web.
---

Viewport-sized FlatList rows must have explicit height, matching min/max height, and `flexShrink: 0`; relying on `flex: 1` can compress every rendered row into the visible web viewport.

**Why:** A vertical feed passed TypeScript checks but React Native Web shrank two supposedly full-height rows so both appeared at once and snap paging never advanced.

**How to apply:** For any vertical one-item pager, measure the pager viewport, use that value for row height and snap offsets, disable row shrinking, and verify the actual scroll node at a mobile web viewport.
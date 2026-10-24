---
name: Native drawing gesture isolation
description: Keep active freehand drawing from competing with a page's vertical scroll gesture on phones.
---

During an active sketch, render a fixed drawing workspace instead of relying only on `scrollEnabled={false}` inside a parent ScrollView. Keep the prompt, timer, drawing canvas, and essential controls in that fixed view; return to the normal scrollable page when the round ends.

**Why:** An iPhone recording showed the visible page shifting while the canvas used PanResponder and its parent ScrollView was disabled during drawing. Removing the scroll container from the active view avoids competing native scroll gestures.

**How to apply:** Use the fixed workspace only during active visual drawing, preserve safe-area sizing and an always-visible Done control, and verify on a physical iPhone because source-level tests cannot prove native gesture arbitration.

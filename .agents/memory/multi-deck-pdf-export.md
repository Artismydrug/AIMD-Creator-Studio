---
name: Multi-deck PDF export
description: An exportSlides artifact-selection issue in workspaces containing multiple slide decks.
---

When a workspace contains several slides artifacts, verify every exported PDF’s title, page count, and first-page text before presenting it. A successful export result can still contain a different registered deck than the requested artifact.

**Why:** A rollout deck export repeatedly returned the separate instructor deck even though the requested artifact ID, registry entry, preview path, workflow, and live preview were correct.

**How to apply:** After exportSlides, inspect the PDF with pdfinfo and first-page text extraction. Do not relabel or deliver a mismatched PDF; keep the live artifact as the source of truth and report the export mismatch clearly.
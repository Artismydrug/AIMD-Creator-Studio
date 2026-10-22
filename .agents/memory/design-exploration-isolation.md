---
name: Sticker Jam visual direction
description: Approved app-wide styling scope and visual/functional sandbox isolation.
---

New visual concepts and design variations must remain in the isolated sandbox and on the shared Canvas board until the user explicitly approves integration. The user has approved Sticker Jam as the app-wide visual direction; preserve each route’s purpose, content, and interactions while applying the shared design system.

Requests for sandbox-only behavior, including inquiry submission and notifications, are also isolated experiments—not approval to change shared app routes, API contracts, authentication, or database schemas. Browser-local demo roles and notifications must be labeled as simulations rather than real creator delivery.

**Why:** The user explicitly requested an inquiry-to-notification pipeline in the sandbox without impacting production routes. Functional prototyping does not waive that boundary.

**How to apply:** Implement and verify the complete interaction within the mockup sandbox. Connect it to real accounts or shared services only after explicit approval.

App-wide styling means visible screen-level treatment, not only changing palette tokens or a few shared cards.

**Why:** The user first explored concepts in isolation, then approved Sticker Jam throughout the app without replacing existing materials or behavior. They explicitly rejected a pass that left other screens looking unchanged.

**How to apply:** Keep new experiments in the sandbox until approved. For Sticker Jam, audit each route’s actual rendered headers and widgets, including parent containers of embedded screens. Apply recognizable card framing and compact accents while preserving route-specific data, copy, navigation, and interactions.

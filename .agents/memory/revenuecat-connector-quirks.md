---
name: RevenueCat connector quirks
description: Non-obvious Replit connector and RevenueCat management API response shapes that affect safe catalog seeding.
---

In the CodeExecution sandbox, call `listConnections("revenuecat")`, then use `connection.proxyFetch(...)` directly. The RevenueCat connector does not provide `getClient()`.

Package product listings return association objects whose product ID is under `item.product.id`, while entitlement product listings return raw product objects with `item.id`.

**Why:** Omitting the connector name or calling `getClient()` fails at runtime. Treating package associations as raw products makes an idempotent seed miss existing attachments and retry them, producing a 422 duplicate-product error.

**How to apply:** Identify apps by stable bundle ID and products by stable store identifier. When reconciling package attachments, read IDs from the nested product; when reconciling entitlement attachments, read the raw product ID.
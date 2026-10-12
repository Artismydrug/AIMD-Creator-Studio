---
name: HTTP query boolean parsing
description: Prevent false-valued query flags from becoming true through generated boolean coercion.
---

Use explicitly validated `"true"` / `"false"` string values for HTTP query flags that pass through generated Zod validators. Do not rely on general boolean coercion for query strings.

**Why:** Generated boolean coercion treats the non-empty string `"false"` as true. This made the Studio Feed's All filter behave like Following even though the mobile client sent the correct flag. An enum-based query contract avoids this ambiguity without changing the existing wire values.

**How to apply:** When adding or changing query flags, check generated validators and test both literal URL values, not just JavaScript booleans. Keep frontend cache parameters and optimistic updates consistent with the generated contract.

---
name: AIMD Academy Light Theme
description: Warm gallery retheme — palette, CSS variables, Shell rewrite, page bulk-replace, and related tier enum bug discovered during retheme.
---

## Palette
| Token | Hex | HSL CSS var |
|---|---|---|
| Background | #FBF9F5 | `39 40% 97%` |
| Card | #FFFFFF | `0 0% 100%` |
| Foreground | #2C2623 | `20 11% 15%` |
| Muted foreground | #6E6660 | `20 7% 40%` |
| Primary (terracotta) | #C85A32 | `16 60% 49%` |
| Secondary (amber) | #E09F3E | `36 72% 56%` |
| Border / divider | #E8E2D9 | `36 25% 88%` |
| Muted / hover | #F2ECE1 | `39 40% 92%` |
| Sidebar | #F7F4EF | `38 28% 95%` |

Radius: `12px`. Shadows: warm rgba(44,38,35,...) series.

## What was updated
- `artifacts/aimd-academy/src/index.css` — full rewrite of `:root` CSS variables; warm shadows; `12px` radius
- `artifacts/aimd-academy/src/components/Shell.tsx` — all hardcoded zinc/emerald replaced with semantic tokens; FAB → terracotta; nav active → `bg-[#F2ECE1] text-primary`
- All page files under `src/pages/` — bulk sed replacements (bg-zinc-*, border-zinc-*, text-zinc-*, emerald-* → semantic/primary tokens)
- `artifacts/aimd-academy/src/components/DropsCountdownBanner.tsx` — wrapper and drop cards updated to light theme; emerald accent → primary

## Bulk sed approach
`sed -i -e 's/bg-zinc-950/bg-background/g' -e ... ` across `src/pages/*.tsx`.
**Why:** ~30+ hardcoded zinc hits per page file made manual edits impractical.
**How to apply:** Run on `src/pages/` and `src/components/` (excluding Shell.tsx which needs targeted edits). Check for `workshop: 'academy'` broken keys after running (see Zod tier issue below).

## Zod tier enum bug (discovered during retheme)
The `lib/api-client-react/src/generated/api.schemas.ts` file had `workshop: 'workshop'` enum entries. After bulk sed replaced string values `'workshop'` → `'academy'`, the keys were left as `workshop: 'academy'` (broken). Fix by also doing `sed -i "s/  workshop: 'academy',/  academy: 'academy',/g"`.

Also fix `lib/api-zod/src/generated/types/userTier.ts` and `lib/api-zod/src/generated/api.ts` (zod.literal and zod.enum calls).

**Why:** The tier was renamed from `"workshop"` to `"academy"` in the DB but not all generated files were updated. The API server returns 500 on `/api/users/me` if Zod rejects the DB value.
**After fixing:** Rebuild API server (`pnpm run build` in `artifacts/api-server/`) and restart the workflow.

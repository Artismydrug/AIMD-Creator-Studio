---
name: PNPM override precedence
description: Preserve existing workspace overrides when adding transitive dependency security pins.
---

Add new transitive dependency overrides to the existing override map in pnpm-workspace.yaml. Do not introduce a separate package.json pnpm.overrides map.

**Why:** In this workspace, package.json overrides take precedence over the workspace map instead of merging with it. Introducing that second map silently removes platform exclusions and existing security/version pins from the resolved lockfile.

**How to apply:** Preserve the workspace map and minimum-release-age protection. After a dependency install, inspect the lockfile diff to ensure the existing overrides remain and unrelated dependencies have not been re-resolved.

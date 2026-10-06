---
name: Workspace package targeting
description: A limitation of the package helper when installing dependencies into an existing pnpm artifact.
---

Artifact-specific dependencies need a targeted pnpm install when the package helper cannot select a workspace package.

**Why:** The helper attempted an installation at the workspace root and failed with the root-workspace guard. Supplying a filter as a package token was also rejected.

**How to apply:** Try the package helper as instructed by the package-management skill. If it rejects the workspace-root install, use an explicit `pnpm --filter` shell command for the existing artifact. Do not bypass the root guard and add artifact-only dependencies to the root.

---
name: Workspace static build environment
description: Static workspace builds load every Vite config without artifact workflow environment variables.
---

All Vite artifact configs must supply safe defaults for `PORT` and `BASE_PATH` when evaluated during a static workspace build.

**Why:** Artifact workflows inject those values for development servers, but a root production build can evaluate all artifact configs without them. Treating either variable as mandatory causes unrelated artifacts to stop the entire publish build before the target app is built.

**How to apply:** When adding or editing an artifact Vite config, use the corresponding artifact manifest port and preview path as defaults while retaining validation for malformed values.
---
name: Expo public environment cache
description: Clear Metro transforms when validating changed EXPO_PUBLIC configuration
---

Clear the Metro transform cache when verifying an Expo release after adding or changing public build-time environment variables.

**Why:** A successful cached export can retain the previous inlined configuration despite updated runtime environment values. Compilation success alone does not prove the new configuration reached the mobile bundle.

**How to apply:** Use `expo export --clear` for the verification export after public configuration changes. Do not print credentials or inspect raw credential-bearing bundles in tool output. Keep provider acceptance checks separate from actual native-device delivery checks.

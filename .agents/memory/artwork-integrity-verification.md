---
name: Artwork integrity verification
description: Distinguish image-rendering problems from irreversible damage in stored upload derivatives.
---

Before claiming that black artwork has been restored, inspect the exact stored image, including its decoded pixels and alpha channel, rather than relying only on a successful download or UI checks.

**Why:** Repeated display fixes did not repair existing uploads because their saved copies were already opaque, entirely black JPEGs. A working image URL and passing transparency tests cannot establish that the original artwork survived conversion.

**How to apply:** Separate display fixes from data recovery. If pixels are already lost, request the original artwork and preserve the existing posts until the owner authorizes replacement. Never describe a background or theme change as restoring damaged image data.

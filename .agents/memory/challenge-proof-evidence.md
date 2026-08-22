---
name: Challenge proof evidence
description: Assurance, privacy, and integrity rules for AIMD challenge proof-of-work media.
---

Challenge capture evidence is self-attested, not cryptographic device attestation. Native-camera UI, timestamps, EXIF-derived fields, and platform origin help reviewers, but new submissions remain pending until human review.

**Why:** Client timestamps and EXIF can be changed or removed, while original media can contain private location or device metadata. The product must not overstate authenticity or expose embedded metadata.

**How to apply:** Bind proof uploads to the authenticated creator and intended challenge use, consume them once, strip embedded metadata before public storage, and calculate the persisted content hash from the exact sanitized bytes that are stored and served.
---
name: Challenge proof evidence
description: Assurance, privacy, and integrity rules for AIMD challenge proof-of-work media.
---

Challenge evidence is self-attested, not cryptographic device attestation. Native-camera UI, timestamps, EXIF-derived fields, and platform origin can help reviewers, but library uploads are also valid and all new submissions remain pending until human review.

**Why:** Client timestamps and EXIF can be changed or removed, while original media can contain private location or device metadata. The product must not overstate authenticity or expose embedded metadata.

**How to apply:** Accept camera captures and library uploads on web/mobile, label their source truthfully, bind them to the authenticated creator and challenge use, consume once, strip metadata, and hash the exact stored rendition.
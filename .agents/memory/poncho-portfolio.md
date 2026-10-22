---
name: Your Studio profile policy
description: Product decision to make Your Studio the public work portfolio and keep editing/account controls separate.
---

Your Studio is each member's work-facing profile, usable by both the owner and visitors. Show the artist's public bio, work, follow/message actions, and an optional inquiry action. The member's own profile is the same portfolio view, not an account-settings screen.

**Why:** The owner clarified that visitors must be able to open a creator's work from the directory and feed, while editing and account management clutter the portfolio.

**How to apply:** The Dashboard profile image opens the owner's Your Studio. Creator Directory identities and feed-post authors open that creator's Your Studio. Keep profile editing, optional inquiry settings, membership/app settings, and account deletion in a separate Edit Profile screen. Do not expose private membership or habit data on public profiles.

Inquiry actions belong to each member and appear on their public profile only when enabled. In the mobile app, Poncho's inquiry action opens the in-app form for Tattoo, Painting, and Other; the website booking page remains separate. Other members can keep using their own saved inquiry links. Reference images stay private and submissions notify the studio by email.

**Why:** The owner wants clients to send a commission request without leaving the app, while each artist still controls whether inquiries are open and private references stay out of public artwork feeds.

**How to apply:** Keep each member's inquiry open/closed setting. Use the existing private booking API, admin queue, and email notification for Poncho's in-app form; do not expose reference attachments as portfolio posts. Leave other members' saved inquiry destinations unchanged unless they request app-based forms.

Use the approved artist-portfolio mockup as the visual reference for Your Studio, rather than creating another separate portfolio or an approximate restyle.

**Why:** The owner repeatedly requested the reference's gallery layout and button placement, while clarifying that it should represent each member's own work.

**How to apply:** Match the reference's layout using real member data and existing inquiry actions, not its decorative copy. The owner explicitly removed “Selected Work” and “Made to stay with you”; keep the gallery focused on artwork and category controls. Keep owner editing available without exposing account settings in the public presentation; never populate member galleries with the mockup's sample artwork.

For the owner-facing portfolio, keep the main surface work-first: the header's icon-only add control starts new work, website/social/Edit Profile stay on one row, and profile counts sit above category filters and artwork.

**Why:** The owner asked to make new work immediately accessible while keeping profile links together, reducing text on Edit Profile, and placing Works/Followers/Following above the category tabs.

**How to apply:** Keep posting mapped to the currently selected work category. Keep owner links in one horizontal row, allowing horizontal scrolling only on narrow screens. Put counts above the category tabs unless the owner requests another layout.

Work categories belong to the creator, not a fixed set of disciplines. Creators can add, rename, remove, reorder tabs, and assign their own artwork.

**Why:** The owner explicitly chose editable categories and work assignment so each member can organize their own practice, rather than inheriting Poncho's tattoo/painting/mural labels.

**How to apply:** Keep All work as the complete gallery. A category rename must preserve its artwork assignments, and removing a category must never delete artwork or silently recreate the removed tab from old post tags.

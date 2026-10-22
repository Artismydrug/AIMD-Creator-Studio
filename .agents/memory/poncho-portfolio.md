---
name: Your Studio profile policy
description: Product decision to make Your Studio the public work portfolio and keep editing/account controls separate.
---

Your Studio is each member's work-facing profile, usable by both the owner and visitors. Show the artist's public bio, work, message action, an optional inquiry action, and the Following count only. The member's own profile is the same portfolio view, not an account-settings screen. Do not show follower counts, follow buttons, or website/social-media buttons on Studio profiles.

**Why:** The owner wants visitors to see a creator's work and send direct inquiries without traditional social-media metrics or external social promotion, while still tracking how many creators the profile follows. Editing and account management should not clutter the portfolio.

**How to apply:** The Dashboard profile image opens the owner's Your Studio. Creator Directory identities and feed-post authors open that creator's Your Studio. Label the pencil action “Edit Profile” so it is distinct from account settings. Keep profile editing, optional inquiry settings, membership/app settings, and account deletion in a separate Edit Profile screen. Do not expose private membership or habit data on public profiles.

Inquiry actions belong to each member and appear on their public profile only when enabled. In the mobile app, Poncho's inquiry action opens the in-app form for Tattoo, Painting, and Other; the website booking page remains separate. Other members can keep using their own saved inquiry links. Reference images stay private and submissions notify the studio by email.

**Why:** The owner wants clients to send a commission request without leaving the app, while each artist still controls whether inquiries are open and private references stay out of public artwork feeds.

**How to apply:** Keep each member's inquiry open/closed setting. Use the existing private booking API, admin queue, and email notification for Poncho's in-app form; do not expose reference attachments as portfolio posts. Leave other members' saved inquiry destinations unchanged unless they request app-based forms.

The in-app inquiry form is opened from a specific studio profile, so the profile owner is the artist context. Do not ask the client to choose from a hard-coded list of unrelated artists; carry the opened profile's creator name into the form and submitted request.

**Why:** The owner clarified that an inquiry should be unique to the profile being viewed, not a shared form listing Edwin, Ash, or other fixed artist choices.

**How to apply:** Pass the profile's creator name into the form, identify the target in its intro, and store that name with the inquiry. Preserve other members' existing external inquiry links until app-based forms are explicitly enabled for them.

Use the approved artist-portfolio mockup as the visual reference for Your Studio, rather than creating another separate portfolio or an approximate restyle.

**Why:** The owner repeatedly requested the reference's gallery layout and button placement, while clarifying that it should represent each member's own work.

**How to apply:** Match the reference's layout using real member data and existing inquiry actions, not its decorative copy. The owner explicitly removed “Selected Work” and “Made to stay with you”; keep the gallery focused on artwork. Keep owner editing available without exposing account settings in the public presentation; never populate member galleries with the mockup's sample artwork.

For the owner-facing portfolio, keep the main surface work-first: the header's icon-only add control starts new work, the pencil-and-text Edit Profile action remains accessible, and the works count can sit above the unified artwork grid.

**Why:** The owner removed social links and follower counts and later restored Following as the only social count, keeping the portfolio focused on creative practice and direct inquiries.

**How to apply:** Do not attach a hidden selected category when starting new work. Preserve owner editing, artwork previews, direct messages, inquiry actions, and safety controls.

Keep the Your Studio inquiry area concise: omit the header inquiry button and place the primary action after the portfolio grid, without the “Let’s make it personal” headline or a second direct-booking link beneath it.

**Why:** On October 22, 2026, the owner asked visitors to see the creator's work before reaching the inquiry action.

**How to apply:** Keep the one primary inquiry action and its existing form flow at the end of the portfolio view; do not put a duplicate inquiry button in the profile header.

Show all uploaded work in one unified portfolio grid without category tabs, category-management drawers, or category-assignment actions.

**Why:** On October 22, 2026, the owner explicitly replaced the earlier editable-category direction with a clean, unfiltered portfolio.

**How to apply:** Keep stored artwork/category records intact; this is a UI simplification, not authorization to delete data. Do not recreate tabs from legacy tags or hard-coded tattoo/art disciplines. Keep owner artwork editing in the preview/options view.

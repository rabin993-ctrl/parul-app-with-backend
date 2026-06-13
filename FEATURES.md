# Parul — Feature Documentation

> A social pet-adoption platform built with Expo / React Native (web + iOS + Android).
> This document describes **every user-facing feature** and the concrete **user interactions**
> derived from the app's screens, components, and contexts. It is written from the user's
> point of view: what they see, what they can tap/type/toggle, and what happens as a result.

---

## Table of Contents

1. [App Shell & Navigation](#1-app-shell--navigation)
2. [Home Feed](#2-home-feed)
3. [Community (Groups)](#3-community-groups)
4. [Paw Circles](#4-paw-circles)
5. [Adoption](#5-adoption)
6. [Rescue Cases](#6-rescue-cases)
7. [Messages](#7-messages)
8. [Vet Consult](#8-vet-consult)
9. [Profile](#9-profile)
10. [Companions / Pets](#10-companions--pets)
11. [Treats & Gamification](#11-treats--gamification)
12. [Notifications](#12-notifications)
13. [Trust, Reviews & Safety](#13-trust-reviews--safety)
14. [Privacy & Account](#14-privacy--account)
15. [Cross-cutting UI Patterns](#15-cross-cutting-ui-patterns)
16. [Coming Soon / Gated Features](#16-coming-soon--gated-features)

---

## 1. App Shell & Navigation

The app is wrapped in a global provider stack (theme, treat wallet, paw circles, community feed/groups, feed posts, adoption, companions, privacy, current-user profile, tab-bar scroll, dev reset).

### Bottom Tab Bar (`GlassTabBar`)
A frosted-glass floating tab bar with 5 primary tabs. It animates/hides in response to scroll.

| Tab | Purpose |
|-----|---------|
| **Feed** | Social feed + the in-app "Home Hub" switcher (Feed / Community / Adoption) |
| **Messages** | One-on-one chats (general + adoption threads) |
| **Circles** | Paw Circles — local pet-parent groups |
| **Vet** | On-demand vet consultations |
| **Profile** | Personal hub: pets, adoptions, rescues, settings |

### Home Hub Switcher
From the Feed tab header, a **dropdown** (`HomeHubDropdown`) lets the user switch the main surface between **Feed**, **Community**, and **Adoption** without leaving the tab. Rescue is reached as a stacked flow. Each hub has its own header chrome, composer bar, and filters.

### Global Actions in Header
- **Theme toggle** — sun/moon icon switches light/dark mode instantly.
- **Search** icon (per surface).
- **Notifications bell** with an unread badge → opens the Notifications screen.

---

## 2. Home Feed

The main social surface where users post, react, comment, and share across their circle and the wider community.

### What the user sees
- App logo header with theme toggle, search, and notifications bell (badge count).
- **Home Hub dropdown** (Feed / Community / Adoption).
- A **Composer bar** with a "New post" input and quick-action buttons.
- A **Circle filter row** showing the active circle and shortcut filters.
- A scrollable list of post cards.

### Composing posts
- **"New post" input** → opens the full **Post Composer**.
- **Plus button** → opens a post-category popup:
  - **Open a case** (red, shield icon) — starts the formal Rescue case flow with public updates.
  - **New post** categories: **Rescue, Adoption, Lost, Found, Meme, Discussion**.
- In the composer the user can write text, pick a category/tag, **@-mention** users/companions (via the Mention Picker), attach a photo, and add Lost/Found alert metadata when relevant.

### Filtering the feed
- **Circle selector** — tap the circle name/chevron to open a drawer listing **My Circle** (created) and **Joined Circle** sections; tap one to scope the feed. Empty state: *"You aren't in any circle yet. Create or explore from Paw Circle."*
- **Shortcut filters** — **Nearby** (map pin) toggles location scope; **Tips** (sparkle) shows a *"coming soon"* modal.
- **Filter button** (sliders) → post-type filter popup: **Lost/Found, Discussion, Meme**, each removable, with a **Clear** link.

### Interacting with a post (`FeedPostCard`)
- Author row: avatar + name + optional companion mention + timestamp. Tapping the author opens their profile; tapping a companion mention opens the companion mini-sheet → full companion profile.
- Body text truncates at ~4 lines with a **more** expander.
- Tag pill (Discussion / Adoption / Lost / Found / Rescue / Paw Posting).
- Media: single image or 2-image grid.
- **Reaction bar:**
  - **Paw** — like/unlike, shows count, fills with primary color when active.
  - **Comment** — opens the Comment Sheet, shows count.
  - **Forward** — opens the Forward sheet, shows count.
  - **Bookmark** — save/unsave (no count), fills when active.
- **Lost/Found cards** get a special urgent layout: red strip with an animated pulsing beacon, "Lost"/"Found" label, "Nearby" badge, pet/location info, photos.

### Comments & replies (`FeedCommentSheet`)
- Title: **"Comments · {count}"**. Empty state: *"No comments yet — be the first to reply."*
- Each thread: avatar + author (both tappable to profile), timestamp, text, and **Paw** / **Reply** actions.
- Nested replies are indented with smaller avatars.
- Inline reply input shows **"Replying to @user"** with a send button.
- Footer input ("Add a comment…") with a send button; typing **@** opens the **Mention Picker**.

### Forwarding / sharing (`ForwardSheet`)
- Title **"Post to"**, subtitle *"Select one or more places."*
- Options: **Feed** plus each joined **Community** (icon, name, member count), multi-select, **Done** to confirm.

### Empty states
- *"Nothing here yet"* / *"No posts match this filter. Try another."*

---

## 3. Community (Groups)

Topic-based public groups with discussion posts, "helpful" reactions, moderation, and admin configuration.

### Community Feed (`CommunityFeedScreen`)
- Aggregated posts from all joined groups, with a composer bar and filter chrome.
- **Filter popup:** "All" vs. a single group, plus multi-select **topics** (General, Rescue, Health, Lost/Found, Tips, Events) and a **Clear** link.
- **No groups joined** empty state: *"Join a group / Discover public groups to start seeing discussions."* → **Discover groups** button.
- Loading state shows a spinner.

### Community post (`CommunityFeedPost`)
- Author row with a **community badge**, post body (4-line truncation + **more**), category label badge, Lost/Found alert meta box, optional image.
- Reaction bar: **Paw (Helpful)**, **Comment**, **Forward**, **Bookmark** — same mechanics as the feed.

### Comments (`CommunityCommentSheet`)
- Same threaded model as the feed: top-level comments, nested replies, inline reply inputs, @-mentions, "Add a comment…" footer. Toasts: *"Comment posted!" / "Reply posted!"*

### Community Hub (`CommunityHubScreen`)
- "Groups" overview with **Your communities** (joined) and **Discover** sections; each row shows icon, name, member count, about text, and a Join/Leave action. Toasts: *"Joined {name}" / "Left {name}."*

### Discover groups (`CommunityDiscoverScreen`)
- Hero ("Find your crowd") with overlapping group orbs and a count.
- Group cards: gradient icon, name, member count, **Public** badge, about text, **Join group** button (toast *"Joined {name}!"*).
- All-joined empty state: *"You're in every group for now."*

### Single group (`CommunityGroupScreen`)
- Cover photo, name, **Creator** badge (if admin), member count, About.
- **Member:** Leave group. **Not joined:** Join group. **Admin:** **Manage group** + **Requests ({n})** (when pending).
- Posts tab scoped to the group; links to Members, Rules, Settings.

### Create a discussion (`CommunityCreatePostScreen`)
- **Edit step:** category toggles (General, Rescue, Health, Lost/Found, Tips, Events, Meme), community selector (if in multiple), **Title** (≥4 chars), **Body** (≥12 chars), optional image, and Lost/Found alert fields (Last seen/Found at, When, Looks like, Contact).
- **Preview step** → **Publish** (toast *"Posted to community"*, then opens the post detail).
- Not-in-a-group empty state with **Discover groups**.

### Post detail (`CommunityPostDetailScreen`)
- Full post with title, body, alert meta, image, threaded comments, and a footer comment input. Author/community badge are tappable.

### Moderation & admin
- **Admin / Manage group (`CommunityAdminScreen`)** — collapsible sections: **Identity** (name, about — creator only), **Guidelines** (rules add/remove), **Topics** (enable/disable, ≥1 required), **Joining** (Open / Request approval / Invite only), **Posting** (require photos for Lost/Found, allow external links, post approval), **Privacy** (members only, show member locations, discoverable in search), **Members** (preview + remove). **Save** → *"Settings saved."*
- **Pending requests (`CommunityPendingRequestsScreen`)** — approve/deny join requests.
- **Members (`CommunityGroupMembersScreen` / `CommunityMembersScreen`)** — browse members across one or all joined groups; tap to open a profile; admins can remove.
- **Rules (`CommunityRulesScreen`)** and **Settings (`CommunitySettingsScreen`)**.

### Saved & search
- **Saved (`CommunitySavedScreen`)** — bookmarked discussions. Empty: *"Nothing saved yet — tap the bookmark on any community post."*
- **Search (`CommunitySearchScreen`)** — live search ("Search discussions, topics, groups…") with the same filter popup.

---

## 4. Paw Circles

Location-based pet-parent groups with group chat, member management, shared media, pinned messages, and admin controls.

### Onboarding (first visit)
- Hero with the Paw Circle logo, **"Welcome to Paw Circle / Connect locally."**
- Featured **local circle** card (e.g., "Dhaka Paw Circle · Dhanmondi · 24 members") with sample member avatars.
- **Join Circle** (toast *"Joined {name}!"*) or **Not Now** to skip. Footer: *"You can join now or explore later."*

### Circles Hub (`CirclesScreen`)
- Header "Paw Circles" with **Create** and **Explore** pills.
- **Your Circles** list: each card shows icon, name, location · member count, **Chat** and **Settings** buttons.
- Empty state: *"No circles yet — Create a circle or explore nearby groups…"*

### Create Circle sheet
- Fields: **Circle name** (required), **Location** (optional, default "Dhaka"), **Privacy** (**Open** = anyone nearby can join / **Request to join** = approval required). **Create Circle** → toast *"Created {name}."*

### Explore Circles (`ExploreCirclesScreen`)
- Search ("Search circles or areas"), filter toggle **All / Popular / Nearby**, a **Near you** featured section, and a **Discover** list of circle cards with **Join circle** / **Joined**. Empty: *"No circles found."*

### Circle Chat (`CircleChatScreen`)
- Header (tap → settings) with circle icon, name, location, member count, 3-dot menu.
- **Tabs: Chats / Members.**
- **Chats:** date pill ("Today"), incoming/outgoing message bubbles (avatars, timestamps, read checks), **shared post cards**, and system messages ("{member} joined the circle"). Composer: **plus** (share a post), **"Message your circle…"** input, **send**. Empty: *"Start chatting! Send the first message or share a post."*
- **Members:** "{X} of {Y} members active", member rows with active/away status dots, tap → user profile, **View all members** → full members screen.

### Members management (`CircleMembersScreen`)
- Circle hero (editable by creator), **Search members**, **Sort by** (Alphabetically / Date added).
- **Pending requests** (admin): per-request **Approve**/**Decline**, plus **Accept all**.
- Member rows with **Admin** tags, handle + companion count; admins get a **Remove** action (toast *"Removed {name}"*).

### Circle Settings (`CircleSettingsScreen`)
- Hero + role line, stats strip (Members / Shared / Pinned), quick actions (Chat / Members / Admin).
- **Manage:** Admin controls (admin), Members (with pending badge), **Mute notifications** toggle.
- **Content:** **Pinned messages** (sheet → tap to jump to message), **Shared media** (sheet with photo grid + file list), media peek grid.
- **Support:** **Report a problem** sheet — 5 reasons (Spam, Harassment, Inappropriate media, Safety concern, Other) + optional details → *"Report submitted."*
- **Leave circle** (non-admin) — two-tap confirm, toast *"Left {name}."*

### Circle Admin (`CircleAdminScreen`, creator only)
- Edit **Name / Location / Privacy** → **Save changes** (*"Circle settings saved"*).
- **Remove members** (per-row), **Transfer ownership** (*"coming soon"*), **Delete circle** (two-tap confirm → *"Circle deleted"*).
- **Edit Circle** sheet (name + bio).

### User profile from a circle (`UserProfileScreen`)
- Avatar, name, handle, location, companion count, bio, the circles they belong to, and a **Message** action.

---

## 5. Adoption

Two parallel journeys — **adopting** a pet and **rehoming/listing** a pet — connected by chat and a post-adoption care timeline.

### Adoption hub (`AdoptionListingScreen`)
Three tabs:
- **Browse** — filter by species (Dog / Cat / All) or **Requested**; listings shown as flip cards; request, share, view detail.
- **My listings** — owned listings with request counts; open the request inbox; edit; mark adopted; re-list.
- **Chats** — segments **Rehoming** (people requesting your pets) and **Adopting** (pets you requested), grouped by pet with status tags and unread dots.

### Flip listing card (`FlipAdoptionCard`)
- Front: photo, name, status badge (**Adopted** / **Urgent** / **Available**), personality quote.
- Back (tap to flip): vaccination, sterilization, species, story, requirements, poster info (avatar, name, rating, reviews).
- Actions vary by role: **View Details, Request, Cancel Request, Share, Open Thread** (adopter); **Edit Post** (owner).

### Listing detail (`AdoptionDetailScreen`)
- Full profile: gallery with thumbnails, name/breed/age/gender, location, vaccination, "Successfully Adopted" banner (if adopted), story/personality, health & care (vaccination, sterilization, microchip), adoption requirements, poster card (name, rating, reviews).
- Actions: **Edit** (owner), **Share story** / **Re-list for adoption** (when applicable).

### Create / edit / manage a listing
- **Create (`AdoptionCreatePostScreen`)** — Name, Species (Dog/Cat), Breed, Age, Gender, Location, Vaccination (Done/Partial/Not yet), Sterilization (Yes/No), one-line personality, full story (≥20 chars), key requirement, **Mark as urgent**, photo placeholder. **Publish listing** → detail view.
- **Edit (`AdoptionEditPostScreen`)** — same fields pre-filled, sticky save/cancel footer.
- **Mark adopted (`AdoptionManagePostScreen`)** — celebratory screen with an optional adoption note ("Successfully adopted through Parul 🐾") and **Mark Successfully Adopted**.

### Requests & inbox
- **Request flow** ends on the **Confirmation screen** (*"Request sent!"*) with **Back to Adoption** / **View pet profile**.
- **Poster inbox (`AdoptionPosterInbox`)** — "Interested in {pet}" list with statuses **New request / In chat / Adopted**; tap to open chat, X to reject.
- Request statuses: `submitted → approved → adopted` (or `rejected`).

### Adoption chats & confirmation
- Chats open into the message thread (see [Messages](#7-messages)) where the poster can **Mark as adopted**, the adopter can **Post update**, and either side can **Relist**.

### Post-adoption care timeline
- **Care timeline (`AdoptedCareTimeline`)** — milestone stepper **Week 1 → Month 1 → Month 3 → Month 6** with completed/current/overdue/upcoming dots and a "{n}/4 complete" status.
- **Home updates (`AdoptionUpdateUI`)** — prompt banner ("{pet} · {milestone}", overdue/Check-in due) and a **Post home update** sheet: up to 3 photos (≥1 required), optional video, optional caption → **Share update**.
- **Endorsements** — the poster can **Recommend / Don't recommend** the adopter; the adopter can respond.

### Search (`AdoptionSearchScreen`)
- "Search by name, breed, or location…", species filter, compact rows, save/unsave. Initial: *"Start typing — Find pets ready for their forever home."* No results: *"No matches."*

---

## 6. Rescue Cases

Formal, followable cases for animals in need, with status progression and media updates.

### Rescue hub (`RescueListingScreen`)
Tabs **Discover / Following / My Cases**, with filters:
- **Where:** Nearby / Everywhere.
- **Type:** Cases / Rescue posts / All.
- **Animal:** Dog / Cat / Other / All.
- **Status:** Any / Active / Under treatment / Recovered.

Empty states: *"Not following any cases", "No cases yet — Use + → Open a case", "No cases match."*

### Case card (`RescueCaseCard`)
- Photo, status pill (**Active / Under treatment / Recovered**), share button, headline, poster (avatar/name/location), stats (updates, followers, date), **Follow case / Following** toggle, **View case**.

### Open a case (`RescueCreateCaseScreen` + `RescueOpenCaseForm`)
- Fields: **Headline** (required), **About the case** (≥12 chars, locks after posting), **Animal** name + species (Dog/Cat/Other), **Location**, **Status** (Active default), **Photos** (≥1, up to 3). **Open case** publishes and opens the case.

### Post an update (`RescuePostUpdateScreen`)
- Auto-dated; **Photos** (≥1, up to 3), optional **Video**, optional **Update** text ("Vet visit, appetite, mood, next steps…"). **Share update** appends to the case timeline.

### Case detail (`RescueCaseDetailScreen`)
- Hero photo, status badge, species tags, about/story, meta strip, **updates timeline**.
- Owner: **Post update**. Non-owner: **Follow** (toggle), **Help** (*"Thanks — the poster will be notified"*), **Share** (*"Case shared"*).

### Search (`RescueSearchScreen`)
- "Search by name, location, or case ID…", species filter, follow/share from results.

---

## 7. Messages

One-on-one chats, including adoption-linked threads.

### Messages list (`MessagesScreen`)
- Header "Messages" + edit icon; thread rows with avatar, name (bold if unread), handle, 2-line preview, timestamp, unread dot. Empty: *"No general chats yet."*

### Chat thread (`ChatThreadScreen`)
- Header (tap → peer options) with avatar/pet visual, title, status subtitle, 3-dot menu.
- Messages: "Today" pill, incoming bubbles (left, avatar) and outgoing bubbles (right, with read check), centered **system messages** for status events. Empty: *"Send the first message…"* / *"Waiting for foster to message you."*
- **Adoption panel** (when the thread is adoption-linked): contextual state plus **Mark as adopted**, **Post update**, **Relist**.
- Composer: image / camera / plus attachment buttons, multiline input (≤2000 chars), send button.

### Peer options sheet (`ChatPeerOptionsSheet`)
- Peer card header, then: **View profile** (→ Circles › UserProfile), **Mute / Unmute conversation** (persisted, toast), **Report** (*"Report submitted…"*), **Block {name}** (danger, confirmation step → toast *"{name} blocked"*).

### Adoption milestone updates from chat
- **Post a home update** sheet — milestone label, prompt, message input, optional photo → saves to the adoption record.

---

## 8. Vet Consult

On-demand vet consultations with a ride-hailing-style urgent match or manual vet selection. Currency is shown in ₹.

### Vet home (`VetScreen` / `VetChrome`)
- Header with **history** (clock) and **browse** (search) icons.
- Hero: "On-demand pet care."
- Two mode cards: **Urgent Vet Consultancy** ("Fast" badge) and **Choose a Vet**.
- **Active consultations** and **Recent** sections list ongoing/completed consults.

### Urgent flow
1. **Issue** — pick from Emergency, Injury (both "Priority"), Digestive, Skin & allergies, Vaccination, Behaviour, General checkup.
2. **Pet** — choose which companion is affected.
3. **Symptoms** — multiline description + optional photo.
4. **Matching** — animated "Finding a vet…" with a 7-step status tracker.
5. **Vet assigned** — vet card (name, title, specialization, rating, response time, fee) + fee breakdown (consult + platform fee = total) → **Continue to payment**.

### Browse flow
- **Browse (`VetBrowseScreen`)** — search by name/specialty, **Available / All vets** toggle, vet list cards (rating, response time, fee, availability badge).
- **Profile (`VetProfileScreen`)** — avatar, title, rating, experience, bio, languages, fee → **Book consultation**.

### Payment & session
- **Payment** — consultation summary, fee breakdown, method selection (**Card / Wallet / UPI**), **Pay ₹{total}**, processing/success/failed states with retry.
- **Status / Session** — 7-step status tracker, status banner, **Start session**, in-session chat with the vet (with system messages), **End session**, and a **receipt** on completion.
- **History (`VetHistoryScreen`)** — past consults with pet, vet, issue, and completion time.

Status lifecycle: `finding_vet → vet_assigned → payment_pending → payment_completed → session_ready → active → completed` (plus `cancelled` / `payment_failed`).

---

## 9. Profile

The user's personal hub (`ProfileHomeScreen`) for pets, adoptions, rescues, content, and account.

### Profile home
- Hero: avatar, name, handle, bio, location, trust badge.
- **Impact stats** (tap to filter content): **Posts, Adoptions, Rescued, Adopted**.
- **Treat wallet pill** (treats left to give + reset countdown).
- **Companions** row (add / open / remove pets).
- **Content tabs** (Posts / Adoptions / Adopted) with alert badges for missed adoption updates.

### Sub-screens
- **Posts (`ProfilePostsScreen`)** — the user's own feed posts. Empty: *"No posts yet."*
- **Activity (`ProfileActivityScreen`)** — comments the user has left; tap to reopen the post's comment sheet.
- **Saved (`ProfileSavedScreen`)** — bookmarked feed posts with full reaction controls.
- **Successful Adoptions (`SuccessfulAdoptionsScreen`)** — gallery of pets the user rehomed: summary stats (Total / This Year / Recent), inspirational banner, 2-column adoption cards → showcase detail.
- **Adopted Animals (`AdoptedAnimalsScreen`)** — pets the user adopted, as showcase rows → care detail.
- **Adopted detail / care profile (`AdoptedDetailScreen` + `AdoptedCareProfile`)** — milestone meter (Week 1 / Month 1 / Month 3 / Month 6), update history, inline **Post update** (photo + text + milestone) for adopters; **Adopter profile card** and **Recommend / Don't Recommend** for posters.
- **Rescues (`RescuesScreen`)** — the user's rescue cases with summary cards (Total / Needs help / Under treatment / Resolved) and status filter tabs → **Rescue case detail**.
- **Reviews & Safety (`ReviewsSafetyScreen`)** — see [Trust, Reviews & Safety](#13-trust-reviews--safety).
- **Settings (`ProfileSettingsScreen`)** — see below.

### Settings (`ProfileSettingsScreen`)
- Trust badge (Trusted adopter / Active adopter / Update pending).
- **About You** — edit bio + location (Edit / Done toggle; save → success toast).
- **Your Shelf** — links to **Activity** and **Saved** (with count).
- **Alerts** — toggles for **Post activity** and **Adoption updates**.
- **Privacy & Account** — links to **Privacy settings**, **Blocked users** (count), "Joined {date}".
- **Sign out** — currently shows a *"Coming soon"* toast.

---

## 10. Companions / Pets

### Add companion (`AddCompanionSheet`)
- **From your adoptions** — chips of confirmed adoption pets (add instantly).
- **Add manually** — Name (required), Species (Dog / Cat / Other), optional Age → **Add**.

### Companion profile (`CompanionProfile`)
- Full-screen modal: hero (avatar with **treat gift burst** animation, name, species, mood), stats (followers, pawprints, treats received), about (breed, age, gender, neutered/vaccinated/microchipped, bio), **Recent Love** (treats received), **Siblings** carousel (swipe between the owner's pets), and the companion's tagged **Posts** grid.
- **More options** → *"More options coming soon."*

---

## 11. Treats & Gamification

A peer-to-peer appreciation system: users spend from a limited, periodically resetting **treat wallet** to send treats to other people's companions.

- **Treat wallet pill (`TreatWalletPill`)** — "{n} to give" (or "None left to give") · "resets in {n}d".
- **Give a treat** — from a companion profile; one per companion. Guard reasons: empty wallet, own pet, not ready, debounce, unknown pet. Success triggers the **treat gift burst** animation and updates the wallet.
- **Owner treats section (`OwnerTreatsSection`)** — total treats received across all companions, an animated "+1 treat from @handle" banner, a **Recent Love** row of gifters, and a **Show treat count** toggle to hide/show the count on the profile.
- **Recent treats row (`RecentTreatsRow`)** — gifter chips (avatar + bone badge, handle, optional "→ pet name").

---

## 12. Notifications (`NotificationsScreen`)

A unified inbox merging adoption notifications and general app notifications.

- Header with unread badge and **Mark all read**.
- **Filter tabs:** All / Unread / Adoption / Circles / Posts.
- **Adoption notifications:** update requests, adoption confirmed, endorsement received, milestones — with dismiss (X) and tap → **Adopted detail**.
- **App notifications:** likes, comments, mentions, lost-pet alerts, **circle join requests** (inline **Accept / Ignore** buttons with toast feedback).
- Type icons: like (heart), comment, circle, adoption, update request (camera), confirmed (check), endorsement (heart), mention (@), lost pet (alert).
- Empty: *"All caught up."*

---

## 13. Trust, Reviews & Safety (`ReviewsSafetyScreen`)

- **Profile reputation** card: trust badge (Trusted / Needs Review / Flagged), numeric rating + stars, review count.
- **Safety status banner:** green *"Your profile meets community safety standards…"* when safe, or a warning/danger banner when under review.
- **Community reviews:** reviewer avatar, name, star rating, timestamp, comment. Empty: *"No reviews yet."*
- Trust badges surface throughout the app (settings header, adopter cards, poster cards) as **Trusted adopter / Active adopter / Update pending**.

---

## 14. Privacy & Account

### Privacy settings (`ProfilePrivacyScreen`)
- **Profile:** Who can see your profile (Everyone / Circles / Only me), Discoverable in search, Show when you're online.
- **Posts & Paws:** Who can see your posts (Everyone / Circles / Only me), Show location on posts, Show companions on profile.
- **Messaging:** Who can message you (Everyone / Circles / No one).
- All settings persist locally.

### Blocked users (`ProfileBlockedUsersScreen`)
- List of blocked users with **Unblock** (toast *"{name} unblocked"*). Empty: *"No blocked users."*
- Users can be blocked/reported from chat peer options and report sheets.

---

## 15. Cross-cutting UI Patterns

- **Sheets / bottom modals** — comments, forwards, companion management, peer options, pinned messages, shared media, report flows.
- **Segmented controls** — notification filters, rescue status filters, content tabs, chat segments.
- **Toasts** — confirm nearly every mutating action (post, save, join/leave, follow, report, block, settings saved, etc.).
- **Empty states** — every list has a descriptive empty state guiding the next action.
- **Status badges & pills** — adoption (Available/Urgent/Adopted), rescue (Active/Under treatment/Recovered), trust badges, request statuses.
- **Mention Picker** — shared @-mention UI across feed, community, and circle composers.
- **Theme** — light/dark via a global theme context, design tokens, and custom fonts (Source Sans 3) gated behind a font loader.
- **Pull/scroll-aware chrome** — the glass tab bar reacts to scroll via a shared scroll context.

---

## 16. Coming Soon / Gated Features

The following are present in the UI but intentionally stubbed:

- **Tips filter** (Feed) — "coming soon" modal.
- **Sign out** (Profile Settings) — "coming soon" toast.
- **More options** (Companion profile) — "more options coming soon."
- **Transfer ownership** (Circle Admin) — "coming soon."
- **Circle invites** (Community Admin) — "invites coming soon."

---

*Generated from the `parul-app` source (screens, components, and contexts). Button labels, field
names, and states quoted above are taken directly from the implementation.*

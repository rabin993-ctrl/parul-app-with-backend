… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 8 — Mobile Polish** for Parul (Expo / React Native). Goal: fix the
mobile-optimization inconsistencies in `docs/MOBILE-OPTIMIZATION-AUDIT.md` and make `npm run tsc` pass.
This wave is **independent of the backend waves** — it can run in parallel with Waves 1–6, anytime.

UNLIKE the backend waves, this one DOES edit UI files — but it is **refactor-only**: preserve the exact
visual appearance and behavior of every screen. No redesigns, no new features. After each change,
the screen must look and behave the same, just smoother/correct on real devices.

Read first: `docs/MOBILE-OPTIMIZATION-AUDIT.md` (the findings + file refs),
`docs/backend/01-architecture.md` §5 (image/CDN strategy). Run **all four sub-agents in parallel** —
they touch mostly different files; coordinate only on shared components (Sheet, Button).

---

**Sub-agent A — Virtualize long lists (High H1)**
- Convert data-driven `ScrollView` + `.map()` lists to `FlatList` (or install `@shopify/flash-list`
  via `npx expo install` and use `FlashList`) with `keyExtractor` and `getItemLayout` where row height
  is fixed: `src/screens/MessagesScreen.tsx` (threads), `src/screens/FeedScreen.tsx` (lens/circle
  drawer), `src/components/ForwardSheet.tsx` (circles/communities/members), `src/components/MentionPicker.tsx`.
  Ensure the **main feed** renders via a virtualized list.
- Keep headers/footers/section layout identical (use `ListHeaderComponent`/`ListFooterComponent`).
- Memoize row components; remove inline object/function creation in hot render paths.
- Done when: the same content renders identically, scrolling is smooth, and no nested-VirtualizedList
  warnings appear.

**Sub-agent B — Safe-area & insets consistency (High H2/H3)**
- Fix `src/components/ui/Toast.tsx` to position from `useSafeAreaInsets()` + the tab-bar height
  (`src/navigation/tabBarInsets.ts`) instead of `bottom: 94`.
- Ensure all sheets/modals (`src/components/ui/Sheet.tsx`, `ForwardSheet`, comment sheets) pad the
  bottom by the safe-area inset so footers clear the home indicator/gesture bar.
- Introduce a small shared `Screen` wrapper (or standardize on the insets hook) and apply it so every
  screen uses ONE safe-area pattern. Don't change visible spacing on devices without notches.
- Done when: on a notch device (or simulator), Toast, sheet footers, and screen edges respect safe
  areas, and non-notch layouts look unchanged.

**Sub-agent C — Keyboard handling + web-on-native style guards (Medium M1/M2)**
- Standardize keyboard avoidance: a single helper/wrapper computing `keyboardVerticalOffset` from
  insets + chrome height; fix `src/screens/ChatThreadScreen.tsx` and `src/components/ui/Sheet.tsx` so
  inputs aren't occluded on Android and sheet headers aren't cut off on iOS. Verify the composer and
  comment sheets (the areas recent commits kept fixing).
- Guard web-only style values behind `Platform.OS === 'web'` (or `.web.tsx` splits): `maxWidth:'100vw'`
  (`Sheet.tsx`), `cursor`/`userSelect` (`GlassTabBar.tsx`, Pressables), `delayPressIn` (`FeedScreen.tsx`).
- Done when: keyboard never hides the active input on either OS; native styles contain no web-only
  values; behavior on web is unchanged.

**Sub-agent D — Clear `tsc` errors + touch targets + images (Medium M3/M5, Verified)**
- Make `npm run tsc` pass: fix the 13 errors in the audit's Verified list (the `absoluteFillObject`
  mis-references, the possibly-null `companion` deref in `CompanionProfile.tsx`, invalid
  `borderStyle:'none'`, the `ChatSublineTone` value, the missing `accordionRule` style, the
  `PhotoSlot`/`FlipAdoptionCard` Image overloads). Fixes must not change rendered output.
- Touch targets: default `IconButton` to ≥44 (keep an explicit small variant); widen tiny `hitSlop`
  areas (e.g. chat attachment buttons) to ~44×44 effective.
- Images: migrate `src/components/ui/PhotoSlot.tsx` (and heavy image spots) to `expo-image`
  (`npx expo install expo-image`) for caching + a loading placeholder; make `resizeMode` a prop
  (default unchanged). This pairs with the thumbnail/CDN work in Wave 7.
- Done when: `npm run tsc` exits 0; interactive targets are ≥44; images show a placeholder and cache.

---

**Integrate & verify:** `npm run tsc` passes (0 errors); `npm start` boots; spot-check on a small
screen (e.g. iPhone SE) that lists scroll smoothly, sheets/Toast respect safe areas, and the keyboard
never covers inputs. Confirm **visual parity** — screens look the same as before. Run `/verify`. Report
and STOP for `/code-review` + commit.

**Guardrails:** refactor-only — no redesigns or behavior changes; preserve visual parity on every
screen; keep web working (`react-native-web`); don't touch backend/context internals here; if a fix
would visibly change a layout, STOP and ask before proceeding.

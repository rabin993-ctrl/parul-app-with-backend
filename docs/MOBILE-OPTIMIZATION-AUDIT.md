# Mobile Optimization Audit — Parul (Expo / React Native)

A review of the existing RN app for **mobile-optimization inconsistencies**. The app also runs on web
(`react-native-web`), so several issues are web-only patterns leaking into native styles. Findings are
grouped by severity. `file:line` references are from a code audit — treat exact lines as approximate
(code shifts), but the patterns are real. The **Verified** section at the end was reproduced directly
via `npm run tsc`.

> Scope note: this is a findings list to guide cleanup. It is **not** a blocker for backend wiring —
> the waves don't touch these. Fix opportunistically (a "Wave 8 — mobile polish" pass is a good home).

---

## High severity

### H1. Long lists use `ScrollView` + `.map()` instead of `FlatList` (no virtualization)
Every row renders/stays mounted at once → jank and memory growth as data grows (and with real backend
data, lists *will* grow).
- `src/screens/MessagesScreen.tsx` — thread list via `ScrollView` + `.map()`, no `keyExtractor`.
- `src/screens/FeedScreen.tsx` — circle/"lens" drawer maps all circles inline.
- `src/components/ForwardSheet.tsx` — circles + communities + members all mapped in `ScrollView`.
- `src/components/MentionPicker.tsx` — mention rows mapped without stable virtualization.
- **The feed itself** must be a `FlatList`/`FlashList` once posts come from the API.
- **Fix:** convert data-driven lists to `FlatList` (or Shopify `FlashList`) with `keyExtractor` and,
  where row height is fixed, `getItemLayout`. This is the single highest-impact change.

### H2. Hard-coded positioning that ignores safe-area insets (notches / home indicator)
- `src/components/ui/Toast.tsx` — `bottom: 94` hard-coded; can collide with the floating tab bar or
  sit under the home indicator on different devices.
- Sheets/modals (`src/components/ForwardSheet.tsx`, others) don't all guarantee a bottom safe-area
  pad, so footers can sit under the gesture bar.
- **Fix:** drive bottom offsets from `useSafeAreaInsets()` + the tab-bar height (you already have
  `src/navigation/tabBarInsets.ts` / `useTabBarScrollPadding()` — apply it consistently).

### H3. Inconsistent safe-area strategy across screens
Some screens use `SafeAreaView edges={[...]}`, some use the insets hook, some hard-code padding. Result:
uneven top/bottom spacing and occasional content under the tab bar/notch.
- **Fix:** pick one pattern (insets hook + a shared `Screen` wrapper) and apply app-wide.

---

## Medium severity

### M1. Keyboard handling is platform-fragile
- `src/screens/ChatThreadScreen.tsx` — `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` and a
  magic `keyboardVerticalOffset` (8 on iOS, 0 on Android); Android can occlude the input.
- `src/components/ui/Sheet.tsx` — `keyboardVerticalOffset={0}` pushes the whole sheet by full keyboard
  height, risking the header being cut off.
- Recent git history ("fix composer behind keyboard", "comment sheet keyboard UX") shows this area has
  been whack-a-mole.
- **Fix:** standardize a keyboard wrapper; compute offset from insets + chrome height; test both OSes.

### M2. Web-only patterns leaking into native styles (also breaks strict `tsc` — see Verified)
- `maxWidth: '100vw'` (`Sheet.tsx`), `cursor`, `userSelect`, `delayPressIn`, `onMouse*` — these are
  web concepts on React Native components.
- **Fix:** gate web-only style with `Platform.OS === 'web'` (or a `.web.tsx` split) so native styles
  stay valid; this also clears several type errors.

### M3. Touch targets below the 44×44 minimum
- `src/components/ui/Button.tsx` — `IconButton` defaults to `size={40}`.
- `src/screens/ChatThreadScreen.tsx` — attachment buttons use `hitSlop={6}` on ~18px icons.
- **Fix:** default interactive targets to ≥44×44 (or generous `hitSlop`); keep a `small` variant for
  dense rows only.

### M4. Hard-coded dimensions that don't scale to small phones
- `src/screens/ChatThreadScreen.tsx` — `BUBBLE_MAX_WIDTH_CAP = 280` (cramped on 320px-wide devices).
- Various fixed widths/heights instead of `%` / `Dimensions` / flex.
- **Fix:** prefer flexible sizing, e.g. `Math.min(screenWidth * 0.75, 280)`.

### M5. Image handling: no loading/placeholder or cache strategy
- `src/components/ui/PhotoSlot.tsx` — `<Image>` with `onError` fallback but no loading state;
  `resizeMode="cover"` hard-coded (crops portrait/landscape mismatches).
- **Fix:** add placeholders/blur-up; use `expo-image` (built-in caching) over `Image`; make
  `resizeMode` a prop. (Pairs with the CDN/thumbnail work in `docs/backend/01-architecture.md` §5.)

---

## Low severity

### L1. Hard-coded colors instead of theme tokens
- e.g. `src/components/MentionPicker.tsx`, `src/components/community/CommunityComposerBar.tsx` use hex
  literals while `src/theme/tokens.ts` exists → no dark-mode variants, drift risk.
- **Fix:** route palette through the theme context.

### L2. Font scaling / overflow not handled
- No `allowFontScaling` policy; large OS font sizes can overflow badges/timestamps/inputs.
- **Fix:** set `allowFontScaling={false}` on compact UI; ensure `numberOfLines`/`ellipsizeMode` on
  labels; test at 200%.

### L3. Absolute-positioned overlays without on-screen bounds checks
- `src/components/ui/HomeHubDropdown.tsx` (anchor math) and composer popups can render partly off-screen
  near edges.
- **Fix:** measure with `onLayout` and flip/clamp to stay in viewport.

### L4. Animation cleanup / native-driver consistency
- `src/components/TreatGiftBurst.tsx` — no cancellation on unmount / rapid re-trigger.
- `src/navigation/GlassTabBar.tsx` — squeeze animation gated to web only (`Platform.OS === 'web'`);
  native misses the effect.
- **Fix:** stop animations on unmount; confirm `useNativeDriver: true` on all transform/opacity
  animations; enable on native where intended.

---

## Verified (reproduced via `npm run tsc`)

The app does **not** currently pass `tsc --noEmit` — 13 errors, several of which are exactly the
web-vs-native inconsistencies above. Reproduce: `npm run tsc`.

```
src/components/CompanionProfile.tsx(463,74)            'companion' is possibly 'null'
src/components/adoption/AdoptionUpdateUI.tsx(858,5)    borderStyle "none" not a valid RN value
src/components/adoption/FlipAdoptionCard.tsx(67,32)    No overload matches this call
src/components/adoption/FlipAdoptionCard.tsx(190,29)   StyleSheet.absoluteFillObject (typo → absoluteFill)
src/components/profile/AdoptedCareProfile.tsx(412,11)  tone value not in ChatSublineTone union
src/components/ui/MockMediaTile.tsx(45,29 / 77,19)     StyleSheet.absoluteFillObject (typo)
src/components/ui/PhotoSlot.tsx(68,13)                 No overload matches this call (Image props)
src/components/ui/Sheet.tsx(401,3)                     maxWidth "100vw" — web unit on native style
src/navigation/GlassTabBar.tsx(369,3)                  cursor "default" — web prop on native style
src/screens/FeedScreen.tsx(1159,9)                     delayPressIn not a Pressable prop
src/screens/pawCircles/CircleSettingsScreen.tsx(654,19) StyleSheet.absoluteFillObject (typo)
src/screens/profile/ProfileSettingsScreen.tsx(430,30)  styles.accordionRule missing
```

Two distinct buckets:
- **Web-on-native style leaks:** `100vw`, `cursor`, `delayPressIn` → guard with `Platform.OS === 'web'`.
- **Real bugs/typos:** `absoluteFillObject` (should be `absoluteFill` or `absoluteFillObject` is valid
  only as `StyleSheet.absoluteFillObject`… here it's mis-referenced), a possibly-null deref, an
  invalid `borderStyle`/tone, a missing style key. These are quick, safe fixes.

> Recommendation: a short, self-contained **"Wave 8 — mobile polish"** pass: (1) FlatList the data
> lists, (2) insets-drive Toast/sheets, (3) standardize keyboard handling, (4) clear the 13 tsc errors,
> (5) bump touch targets, (6) move to `expo-image`. None of it blocks backend wiring, and all of it is
> low-risk, high-feel.

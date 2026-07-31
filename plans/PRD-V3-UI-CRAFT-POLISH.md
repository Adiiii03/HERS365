# HERS365 v3 PRD: UI Craft Polish and Design System Unification

## 1. Title, mission, and ownership

**Mission.** Take HERS365 from a UI that reads as machine assembled to one that reads as crafted, at an award winning bar, without changing a single layout, information architecture, or brand color. The founder's words are the acceptance bar: the app "doesn't feel real," is "not eye catching," and has a "weak identity" even after the purple/pink/neon rebrand shipped. The diagnosis (section 2) is not that the design is wrong; it is that the design system exists on paper and is bypassed almost everywhere, so the same button, card, gray, and font size are re typed by hand hundreds of times and drift. This rollout does two things and only two things: it collapses four competing token systems into one enforced source of truth wired through a small set of real component primitives, then it migrates every surface onto them and adds a short list of signature moments that make hero screens feel alive. Layouts stay. IA stays. The palette (purple `#8B3BFF`, hot pink `#FF2E93`, neon green `#39FF14`, the dark neutral ramp, DM Sans body plus Barlow Condensed display) stays exactly as shipped in v2.

**Who executes.** The coding agent Fable 5 implements this end to end against the real repo at `/Users/samueladu/HERS365`, client only (`client/`). No server file changes.

**Who reviews.** Samuel (tech lead) reviews every workstream against the acceptance criteria in section 8 and the verification plan in section 9.

**Executable contract.** Every requirement below names real files, real classes, real counts, and a verifiable check. The counts in section 2 are the live baseline measured on `main` at the time of writing; they are the numbers the verification plan asserts against. Do not invent structure that contradicts the current state in section 2, and do not "improve" a layout, route, or copy string that this PRD does not name.

---

## 2. Current state (do not rebuild what exists)

**Stack and entrypoints.** Client is React 19 plus Vite plus Tailwind 3 plus Capacitor (iOS) at `client/`. Motion libraries `framer-motion` and `gsap` are already installed, as are `clsx` and `tailwind-merge`. Dev is `npm run dev` (Vite) from `client/`. There is a Vitest suite (`npm run test`). This rollout is client only; the server is untouched.

**The design system is designed, then bypassed.** This is the whole problem. There are **four** parallel token systems and none is the source of truth pages actually use:

- **A. `client/src/index.css` `:root` (lines 2 to 54).** The most complete and well thought out layer: an 8pt spacing scale (`--space-1` to `--space-10`, `index.css:9`), a neutral ramp (`--surface-0:#0A0A0C` to `--text-tertiary:#6B6B76`, `index.css:16` to `23`), brand tokens (`--accent:#8B3BFF`, `--pink:#FF2E93`, `--neon:#39FF14`, `--gradient-brand`, `index.css:26` to `36`), radius tokens (`--radius-sm:8px` to `--radius-full`, `index.css:39` to `43`), and elevation tokens (`--elev-card`, `--elev-raised`, `--elev-overlay`, `--accent-glow`, `index.css:46` to `49`). It is barely consumed: roughly 31 `var(--…)` references exist across all `.tsx` files combined.
- **B. `client/tailwind.config.js`.** A `coral` ramp 50 to 900 (`coral.500:#8B3BFF`), `pink.500`, `neon.500`, a `surface` object (`DEFAULT:#111111`, `card:#161616`, `hover:#1c1c1c`, `border:rgba(255,255,255,0.06)`), an `ink` object, and `sans:DM Sans` / `display:Barlow Condensed`. No radius/shadow/spacing extensions, so Tailwind defaults run alongside the CSS var scale. Note the surface hexes here (`#111111`, `#161616`) do NOT equal the `:root` surfaces (`#0A0A0C`, `#121216`) — two different "dark backgrounds."
- **C. `client/src/lib/theme.ts`.** Exported JS constants (`FLAME='#8B3BFF'`, `PINK`, `NEON`, `MUTED='#666666'`, `DISP`, `BODY`). Effectively dead: imported by 2 files of ~90 (`pages/Feed.tsx`, `pages/ComingSoon.tsx`). It also carries two bugs: `theme.ts:15` `DISP` is set to DM Sans, not Barlow (the "display" constant is the body font), and `theme.ts` uses `fontWeight:900` where `index.html:29` only loads DM Sans 300 to 700, so 900 cannot render.
- **D. Per file copied `const` palette blocks — the system pages actually use.** The palette is re declared at the top of ~40 files. `const FLAME='#8B3BFF'` appears in 31 files (`components/BottomTabBar.tsx:6`, `NotificationBell.tsx:7`, `ProfileCompletionBanner.tsx:8`, `UpgradeGate.tsx:6`, `ShareCard.tsx:7` as `ACCENT`, plus 25 pages). `const MUTED`/`MUTED_2` appear in ~40 files and have drifted into at least six different grays: `#8a8a86`/`#5a5a56` (most files), `#9a9a96`/`#7d7d78` (the auth cluster: `Auth.tsx:17`, `ResetPassword.tsx:14`, `ForgotPassword.tsx:14`, `GuardianVerify.tsx:8`), `#8a8a85` (`Onboarding.tsx:15`), `theme.ts` `#666666`/`#444444`, and the CSS `--text-secondary:#A0A0AB`/`--text-tertiary:#6B6B76`. None reconcile.

**The measurable symptom of D.** In `client/src/**/*.{ts,tsx}` today: **2,264 inline `style={{}}` props** and **1,162 raw hex literals**. The inline styles carry the whole visual language by hand: `color`×1180, `fontSize`×1004, `fontWeight`×629, `padding`×616, `background`×598, `borderRadius`×457, `border`×396, `letterSpacing`×380, `textTransform`×331, `fontFamily`×322. The most inline heavy files are `pages/Recruiting.tsx` (160), `pages/Profile.tsx` (160), `pages/Messages.tsx` (111), `pages/Feed.tsx` (103), `pages/Auth.tsx` (86), `pages/Training.tsx` (81). The most repeated hexes are `#fff`×161, `#8b3bff`×158, `#f4f4f2`×114 (a primary text color that exists in none of the four systems above), `#555`×87, `#444`×69, `#4ade80`×49, `#8a8a86`×37.

**No component primitives exist.** There is no `Button`, `Card`, `Input`, `Badge`, `Chip`, `Modal`, `Sheet`, `Dialog`, `Stat`, or `EmptyState` React component, and no `ui/`, `primitives/`, `common/`, or `shared/` folder. `clsx` and `tailwind-merge` are installed but imported **zero** times; there is no `cn()` helper. The only real reusable primitive is `components/Skeleton.tsx` (`Skeleton`, `VisuallyHidden`).

**A partial class based primitive layer exists in `index.css` and is half dead.** The `.k-*` utility classes (`index.css:250` to `655`) were an earlier attempt at primitives. Adoption is partial and several are dead code: `.k-card` (44 uses), `.k-btn` (28), `.k-input` (18), `.k-btn-primary` (11), `.k-card-hover` (7), `.k-btn-ghost` (3), but `.k-badge-*` (0), `.k-pos-badge` (0), `.k-tag` (0), `.k-display` (0), `.k-icon-btn` (0), `.score-badge` (0). Even where `.k-card` is used, it is routinely overridden inline (`pages/Teams.tsx:179` is `className="k-card"` plus a `style={{padding, marginBottom, position, overflow}}` override). These `.k-*` classes are the correct visual spec for the primitives this PRD builds; reuse their values, do not reinvent them.

**No enforced type scale.** Two disconnected sizing worlds, both fragmented. Tailwind `text-*` classes are used unevenly (`text-sm`×127, `text-xs`×41, `text-xl`×38, down to `text-5xl`×1, plus off scale `text-[10px]`×7). Inline `fontSize` (×1004) uses ~30+ distinct rem values with visually indistinguishable near duplicates (`0.82rem`×54, `0.85rem`×64, `0.78rem`×46, `0.72rem`×54) and notation drift (`.72rem` and `0.72rem` both appear). Font weight is spread across `font-bold`×93, `font-semibold`×51, `font-medium`×63, `font-black`×35, plus inline `fontWeight` ×629.

**No enforced radius, spacing, or elevation.** Radius classes: `rounded-lg`×107, `rounded-full`×36, `rounded-2xl`×24, `rounded-3xl`×17, `rounded-xl`×15, with no rule for which surface gets which; meanwhile `.k-card` hardcodes `12px` and `.k-btn` hardcodes `9px`, and inline `borderRadius` (×457) uses raw `5`/`7`/`8`/`9`/`10`/`12`, so buttons do not even share a corner radius. The `--space-*` and `--radius-*` tokens are essentially unreferenced inline. The designed elevation tokens `--elev-card/-raised/-overlay` are effectively unused; cards rely on borders or ad hoc `boxShadow` (×44 bespoke rgba strings).

**Brand naming still says the old brand.** The palette is purple/pink now, but the code calls it "coral"/"orange" **126** times, including a literal `.coral{color:#8B3BFF}` (`index.css:322`), `@keyframes glow-coral` (`index.css:214`), `.k-badge-coral` (`index.css:599`), and the entire Tailwind `coral` ramp. This is legacy naming, not a second color.

**Native feel is under wired for an iOS app.** `@capacitor/haptics` is installed and used **zero** times, even though ~23 files already have `whileTap={{scale:…}}` press animations that are the exact call sites for `Haptics.impact()` (`BottomTabBar.tsx:54`, `ParentDashboard.tsx:277` and `285` on the safety critical Approve/Deny, and coach status controls). `@capacitor/splash-screen` is installed and never configured (no controlled `hide()` on ready). What is already good and must NOT be rebuilt: safe area insets are handled correctly (`index.html:9` `viewport-fit=cover`; `index.css:3` to `6` define `--sat/--sab/--sal/--sar` from `env(safe-area-inset-*)` and they are consumed in the shells); `StatusBar` and `Keyboard` are wired in `App.tsx:238` to `263`; overscroll and tap highlight are handled globally (`index.css:63` to `64`); and `BottomTabBar.tsx` is genuinely well crafted (frosted `blur(24px) saturate(1.6)`, spring `whileTap`, a shared `layoutId="tab-indicator"` that slides between tabs) and is the reference bar for native feel elsewhere.

**Motion is broad but not systematic.** `framer-motion` is imported in ~50 files, but there is no shared variants/transitions module; ~23 files each hardcode their own spring (stiffness 600/damping 22 in `BottomTabBar.tsx:55`, 400/28 in `ParentDashboard.tsx:49`, 500/32 elsewhere), so press feel and motion drift per component. `gsap` is used in exactly one file (`pages/coach/CoachMessages.tsx`). A good page transition exists but only on the athlete shell: `Layout.tsx:31` to `41` defines `pageTransition` wrapped in `AnimatePresence mode="wait"`; `CoachLayout.tsx:217` to `219` and `ParentLayout.tsx:59` to `61` render a bare `<Outlet/>`, so coach and parent route changes are abrupt. `pageTransition` is local to `Layout.tsx`, not exported.

**States and feedback are uneven.** `Skeleton.tsx` is solid (CSS sheen, `prefers-reduced-motion` kill, SR companion) but imported in only 2 pages (`Recruiting.tsx`, `Rankings.tsx`); every other loading state is a spinner (13 files use `animate-spin`/`Loader2`) or bare text (22 `"Loading..."` literals, e.g. `ParentDashboard.tsx:199`, `256`, `314`). `GlobalErrorBoundary.tsx` is strong and must not be rebuilt (it sanitizes errors, hides stack traces from minors, shows a branded card). Empty states vary from well built (icon plus copy plus CTA in `CoachRoster.tsx:287` to `298`, `CoachScoutingBoard.tsx:260` to `278`) to bare one liners (`CoachDashboard.tsx:231` "No recent activity", `ParentDashboard.tsx:203`, `CoachAnalytics.tsx:231`/`264`/`294`, `MaxPrepsLookup.tsx:173` "No data available"). Feedback: `@capacitor/toast` is installed but unused; there is a good custom toast (`NotificationContext.tsx`, `showNotification(type,title,message)`) used in 13 files, but skewed to the coach side and missing on the two most consequential moments in the app: the parent Approve/Deny (`ParentDashboard.tsx:139` to `158` fire no toast and no haptic) and `GuardianVerify` (inline error text only).

**The coach surface is a different design language than the rest of the app.** The three coach content pages render on generic bootstrap `bg-gray-900`/`bg-gray-800`/`border-gray-700` plus `blue-600`/`red-600` accents (gray or blue class hits: `CoachDashboard` 15, `CoachRoster` 20, `CoachScoutingBoard` 13, `CoachAnalytics` 22), while their own wrapper `CoachLayout.tsx` uses brand `surface`/`ink` tokens with a green accent, and the rest of HERS365 is purple on near black with Barlow Condensed display. The net effect (bootstrap gray dashboards inside a green shell inside a purple app) is the single clearest "template/AI generated" tell in the product. There is also live demo risk: `CoachLayout.tsx:47` to `51` feeds the notifications dropdown hardcoded mock data ("Sarah Johnson applied…") and `CoachDashboard.tsx:220` prints a hardcoded "2 hours ago" on every activity row.

**What already works and this rollout must preserve, not touch:** the safe area system, `StatusBar`/`Keyboard` bootstrap, `BottomTabBar` native feel, `Skeleton`, `GlobalErrorBoundary`, `NotificationContext` toasts, `ShareCard` PNG export, the athlete `pageTransition`, and all routing, IA, page layouts, and copy.

---

## 3. Goals and non goals

### Goals for THIS rollout
1. One enforced token source of truth. The four systems collapse to a single canonical token module wired to the `index.css :root` variables and the Tailwind theme, so `#8B3BFF`, the muted grays, `#f4f4f2`, DM Sans/Barlow, the radii, and the spacing each have exactly one name.
2. A small, real component primitive library (`Button`, `Card`, `Input`, `Chip`, `Badge`, `Stat`, `Sheet`, `EmptyState`, plus the existing `Skeleton`) built from the `.k-*` visual spec, with a `cn()` helper using the already installed `clsx` + `tailwind-merge`.
3. Every surface (athlete core loop, pre launch public gate, coach, parent) migrated onto the tokens and primitives, eliminating the bulk of the 2,264 inline styles and 1,162 raw hexes and killing the per file palette copies.
4. The coach surface brought onto the brand design language so it is visually one app with the rest of HERS365.
5. One motion system: shared spring/duration/variant tokens, page transitions on all three shells, and `@capacitor/haptics` wired into the shared press layer.
6. One states and feedback standard: content shaped skeletons in place of spinners and "Loading..." text, one `EmptyState` primitive, and toast plus haptic feedback on every mutation, including the parent Approve/Deny and `GuardianVerify`.
7. A short list of signature moments (section 7) that make the hero screens feel real, strictly within existing layouts.
8. WCAG AA craft floor: 44px minimum tap targets everywhere, visible focus rings on all interactive elements, and AA contrast on text and accents.

### Non goals for THIS rollout
- No layout, IA, routing, navigation structure, or page composition changes. No new pages, no removed pages, no moved sections.
- No palette change. Purple `#8B3BFF`, hot pink `#FF2E93`, neon green `#39FF14`, and the dark ramp are fixed. Contrast tuning that stays within the same hue family (for AA) is allowed; new brand colors are not.
- No new runtime dependencies. Everything needed (`clsx`, `tailwind-merge`, `framer-motion`, `gsap`, all Capacitor plugins) is already installed. A design token tool or `class-variance-authority` may be added only if section 11 approves it; default is no new deps.
- No copywriting rewrites except replacing hardcoded mock/demo data (`CoachLayout.tsx:47` to `51`, `CoachDashboard.tsx:220`) with real state or a neutral empty state.
- No server, schema, endpoint, or auth changes.
- No feature additions. Pull to refresh, new charts, and new dashboards are out of scope except where a signature moment in section 7 explicitly names one.

---

## 4. Users and the quality bar

**Users.** Underage girl flag football athletes (the athlete core loop, mobile first, iOS native), their parents/guardians (the paying customer, the parent dashboard and guardian verification flow), coaches (the coach dashboards), and the public (the pre launch marketing gate). The emotional target is a girl who opens this next to TikTok, Instagram, and Hudl and feels it belongs on that shelf.

**"Feels real," defined as testable craft.** The founder's bar ("award winning," "eye catching," "feels real") is made concrete as: (a) any two screens use the same gray, the same card, the same button, the same corner radius, and the same font sizes, because they import them from the same place; (b) every tap gives visual plus physical feedback; (c) nothing pops in without a skeleton or transition; (d) every hero screen has one moment that is clearly hand crafted, not generic; (e) no screen looks like a different app (the coach de bootstrapping). Section 8 turns each of these into a pass/fail check.

---

## 5. Design invariants (rules Fable 5 must never break)

1. **Tokens or primitives only.** After a file is migrated, it must not contain a raw hex literal, a raw `fontSize` rem value, or a raw `borderRadius` number in a `style` prop. Color, type, radius, spacing, and elevation come from tokens; buttons/cards/inputs/badges/chips/stats come from primitives.
2. **Layout is frozen.** Do not change DOM structure that affects layout, order, spacing rhythm at the section level, routing, or copy. This is a reskin of the same skeleton, not a redesign. When in doubt, the pixels move less, not more.
3. **Palette is frozen.** No hue outside purple/pink/neon/neutral. The one purple is `#8B3BFF`; there is no second purple.
4. **Reuse the good parts.** `BottomTabBar`, `Skeleton`, `GlobalErrorBoundary`, `NotificationContext`, `ShareCard`, safe area vars, and the athlete `pageTransition` are the reference implementations. Extend them; do not rebuild them.
5. **No new deps without a section 11 sign off.**
6. **Respect `prefers-reduced-motion`.** Every animation added must degrade (the pattern already exists at `index.css:101` to `102`).
7. **Verifiable or it did not happen.** Every workstream lands with the grep/visual/tap checks in section 9 passing.

---

## 6. Workstreams

Workstreams are ordered by dependency. F and C are the foundation; nothing else can start clean until they exist. M and S are horizontal systems. P is the migration that consumes F, C, M, S. G and A ride on top. A is enforced continuously, not saved for last.

### F — Foundation: one token source of truth
- **F1.** Create `client/src/lib/cn.ts` exporting `cn(...)` built on `clsx` + `tailwind-merge` (both already installed). This is the class composition helper every primitive uses.
- **F2.** Create `client/src/lib/tokens.ts` as the single canonical token module: colors (brand + the neutral ramp + the one reconciled muted scale), the type scale (a fixed, named set of sizes and weights that map to the DM Sans/Barlow reality in `index.html:29`), radii, spacing, and elevation. Values come from the `index.css :root` set (the best existing layer) and the `.k-*` classes. `theme.ts` is re exported from here for its two current importers, then deprecated; fix the two `theme.ts` bugs (`DISP` should be Barlow, drop `fontWeight:900` on DM Sans) as part of the reconciliation.
- **F3.** Reconcile the split surfaces and grays: pick one dark ramp (the `:root` `--surface-*` set is the reference) and make `tailwind.config.js` `surface`/`ink` and the tokens module agree; collapse the 6+ muted grays to one `text-secondary`/`text-tertiary` pair; give the orphan `#f4f4f2` primary text one home (reconcile toward `--text-primary`).
- **F4.** Rename the legacy `coral`/`orange`/`glow-coral`/`k-badge-coral` naming to brand accurate names in a single mechanical pass (`index.css`, `tailwind.config.js`, and call sites), so nothing in the code calls the purple "coral." Keep a temporary `coral` Tailwind alias only if needed to avoid a big bang, and note it for removal.

### C — Component primitives
- **C1.** Build `client/src/components/ui/` with `Button`, `Card`, `Input`, `Chip`, `Badge`, `Stat`, `Sheet`, and `EmptyState`, each consuming tokens via `cn()` and matching the `.k-*` visual spec (`.k-btn`/`.k-card`/`.k-input`/`.k-badge-*`/`.k-tag`/`.k-stat-block`/`.k-pos-badge`). Add a `components/ui/index.ts` barrel.
- **C2.** `Button` variants (`primary`/`ghost`/`danger`) and sizes all enforce `min-height:44px` and a `focus-visible` ring, and fire the shared haptic (see M3) on press. This is the component that fixes the coach `px-4 py-2` sub 44px buttons in one move.
- **C3.** `EmptyState` takes `icon`, `title`, `body`, and optional `cta`, matching the best existing empty states (`CoachRoster.tsx:287` to `298`), so the bare one liners can be replaced identically.
- **C4.** Keep `Skeleton` as is; add composed skeletons (`StatCardSkeleton`, `RowSkeleton`, `CardSkeleton`) in the same folder for S1.

### M — Motion and native feel
- **M1.** Create `client/src/lib/motion.ts` exporting shared spring/duration tokens and named variants (press, page transition, list stagger, sheet). Replace the ~23 hand tuned per component springs with these tokens.
- **M2.** Lift `Layout.tsx`'s `pageTransition` into `motion.ts` and apply the same `AnimatePresence` wrapped transition to `CoachLayout.tsx:217` and `ParentLayout.tsx:59` so all three shells transition identically.
- **M3.** Wire `@capacitor/haptics` behind a tiny `useHaptics()`/`haptics.press()` helper (guarded by `Capacitor.isNativePlatform()`), called from `Button` (C2), `BottomTabBar` tab change (`BottomTabBar.tsx:54`), and the parent Approve/Deny (`ParentDashboard.tsx:277`, `285`, `notification` style haptic for the safety action).
- **M4.** Configure `@capacitor/splash-screen` `hide()` on app ready in the `App.tsx` native bootstrap (currently installed, unused), so splash dismissal is controlled.

### S — States and feedback
- **S1.** Replace spinner and "Loading..." states on the data heavy surfaces with content shaped skeletons using C4: `CoachDashboard` stat tiles (kill the "wall of zeros" at `CoachDashboard.tsx:149` to `179`), `ParentDashboard` child cards (`:199`/`256`/`314`), `CoachRoster` (`:212` to `218`), `CoachScoutingBoard` (`:246` to `249`), and the remaining athlete pages that show bare spinners.
- **S2.** Replace every bare empty state one liner with `EmptyState` (`CoachDashboard.tsx:231`, `ParentDashboard.tsx:203`, `CoachAnalytics.tsx:231`/`264`/`294`, `MaxPrepsLookup.tsx:173`).
- **S3.** Route every mutation through `NotificationContext` toast plus a haptic. Fix the silent successes (`CoachScoutingBoard.tsx:99`, `115`), add feedback to the parent Approve/Deny (`ParentDashboard.tsx:139` to `158`) and `GuardianVerify` (currently inline only). Replace the duplicated local spinner in `GuardianVerify.tsx:206` with the shared one (`index.css:665`).

### P — Per surface migration onto tokens and primitives
Migrate in priority order, each file swapping inline hex/size/radius for tokens and inline buttons/cards/badges/inputs for primitives. No layout change.
- **P1. Pre launch public gate:** `ComingSoon.tsx`, `LandingPage.tsx`, `Footer.tsx`, `Contact.tsx`. This is what the world sees while registration is locked; it ships first.
- **P2. Athlete core loop:** `Feed.tsx`, `Rankings.tsx`, `PlayerProfile.tsx`, `Profile.tsx`, `Explore.tsx`, `Training.tsx`, `Onboarding.tsx`, `Auth.tsx`. Highest inline debt lives here (`Profile.tsx`, `Recruiting.tsx`, `Messages.tsx`, `Auth.tsx`).
- **P3. Coach surface + de bootstrapping:** `CoachDashboard.tsx`, `CoachRoster.tsx`, `CoachScoutingBoard.tsx`, `CoachAnalytics.tsx`, and the rest of `pages/coach/`. Replace all `bg-gray-*`/`blue-600`/`red-600` with brand tokens and Barlow display headings; convert the native `<select>` status control (`CoachRoster.tsx:352`) to a branded control; add row exit animations and cap the per index stagger (`:323`, `:431`); remove hardcoded mock notifications (`CoachLayout.tsx:47` to `51`) and the hardcoded "2 hours ago" (`CoachDashboard.tsx:220`).
- **P4. Parent surface:** `ParentDashboard.tsx`, `GuardianVerify.tsx`, `ParentLayout.tsx`. Wire the hardcoded safety chips (`ParentDashboard.tsx:220` to `229`) to real per child settings; apply the token/primitive migration; keep this surface's already good structure.

### G — Signature moments
See section 7. Each is scoped to one screen, within its existing layout.

### A — Accessibility and craft floor (continuous)
- **A1.** 44px minimum on every interactive element (delivered largely by `Button` C2; audit remaining icon buttons: `MobileNav.tsx:110`, `CoachLayout.tsx:126`/`152`).
- **A2.** `focus-visible` ring on every interactive element; fix non semantic controls (`CoachScoutingBoard.tsx:383` `<div onClick>` becomes a real button).
- **A3.** AA contrast verified on body text, muted text, and accent on surface. Tune within hue family only.

---

## 7. Signature moments (the award winning set)

Five moments, each strictly within its existing layout, each on a hero surface. These are what push "consistent" to "eye catching."

1. **Rankings reveal.** The `YourRankDock` and scoreboard already exist; add a one time count up plus a spring settle when a rank first renders, and a subtle neon pulse on your own row. (`Rankings.tsx`, `YourRankDock.tsx`.)
2. **PlayerProfile hero.** Give the profile header one crafted moment: parallax or gradient depth on the hero, Barlow stat numerals that count up on first view, and a premium `ShareCard` trigger (the export already exists). No new sections. (`PlayerProfile.tsx`, `ShareCard.tsx`.)
3. **Onboarding momentum.** Add step to step transition choreography and a completion moment (haptic plus neon flourish) so finishing onboarding feels earned. (`Onboarding.tsx`.)
4. **Coming Soon that sells.** The pre launch gate is the first impression; give it one signature background/typographic moment on brand (animated gradient mesh within the palette, Barlow display headline treatment) so a locked app still feels premium. (`ComingSoon.tsx`.)
5. **Native tab and press feel everywhere.** Promote the `BottomTabBar` quality bar app wide via the shared haptic press layer (M3), so every primary action across athlete, coach, and parent feels physical. This is the moment that reads as "real app," not "website."

---

## 8. Acceptance criteria (verifiable, per workstream)

**F — Foundation**
- `client/src/lib/cn.ts` exists and `clsx` + `tailwind-merge` import count is greater than 0 (today: 0).
- `client/src/lib/tokens.ts` exists and is the import source for color/type/radius/spacing in migrated files.
- One dark ramp: `tailwind.config.js` `surface` and the tokens module reference the same hexes (no `#111111` vs `#0A0A0C` split).
- Muted grays collapsed: the 6+ values in section 2 reduce to one `text-secondary`/`text-tertiary` pair in migrated files.
- "coral"/"orange" identifier count drops from 126 toward 0 (a temporary aliased `coral` in `tailwind.config.js`, if kept, is the only allowed remnant and is annotated for removal).

**C — Primitives**
- `client/src/components/ui/` exports `Button`, `Card`, `Input`, `Chip`, `Badge`, `Stat`, `Sheet`, `EmptyState` with a barrel.
- `Button` renders `min-height:44px` and a `focus-visible` ring in all variants/sizes, and fires the shared haptic on native.
- The dead `.k-badge-*`/`.k-tag`/`.k-pos-badge`/`.k-icon-btn` (0 uses today) are either consumed by the new primitives or removed; no dead primitive CSS remains.

**M — Motion/native**
- `client/src/lib/motion.ts` exists; per component inline spring definitions drop from ~23 toward the shared tokens.
- All three shells (`Layout`, `CoachLayout`, `ParentLayout`) run the same page transition (no bare `<Outlet/>` in `CoachLayout.tsx:217`, `ParentLayout.tsx:59`).
- `@capacitor/haptics` import count is greater than 0 (today: 0) and is called from `Button`, tab change, and parent Approve/Deny.
- `@capacitor/splash-screen` is configured with a controlled `hide()` in `App.tsx`.

**S — States/feedback**
- `Skeleton`/composed skeleton usage rises from 2 pages toward every data heavy page; the 22 `"Loading..."` literals and the coach/parent spinner states named in S1 are gone.
- `EmptyState` replaces the bare one liners named in S2.
- The parent Approve/Deny and `GuardianVerify` fire a toast plus haptic; `CoachScoutingBoard` mutations no longer succeed silently; `@capacitor/toast` unused status is acceptable (custom toast is the standard) but no mutation is left without feedback.

**P — Migration**
- Inline `style={{}}` prop count trends sharply down from 2,264 across the migrated files, and raw hex literal count trends down from 1,162 (target: the top offenders `Profile.tsx`, `Recruiting.tsx`, `Messages.tsx`, `Feed.tsx`, `Auth.tsx`, `Training.tsx` each carry near zero raw hex after migration).
- Per file `const FLAME`/`const MUTED` palette blocks (31 and ~40 files) are removed in migrated files, importing tokens instead.
- Coach pages carry zero `bg-gray-900/800`, `blue-600`, `red-600` (today 15/20/13/22 hits); coach headings use Barlow display; no hardcoded mock notifications or "2 hours ago" remain.
- Parent safety chips reflect real per child settings, not hardcoded `Public / Parent Gated / Off`.

**G — Signature moments**
- Each of the five moments in section 7 is present and demoable, respects `prefers-reduced-motion`, and does not alter its screen's layout or copy.

**A — Accessibility**
- No interactive element under 44px (spot check `MobileNav.tsx:110`, `CoachLayout.tsx:126`/`152`, all coach action buttons).
- Every interactive element shows a visible `focus-visible` ring; no `<div onClick>` interactive controls remain (`CoachScoutingBoard.tsx:383`).
- Body, muted, and accent text pass AA contrast on their surfaces.

**Global gates**
- `npm run lint` and `npx tsc --noEmit` (client) pass.
- `npm run test` passes; add render tests for each new primitive and a token snapshot.
- No new runtime dependency in `client/package.json` unless section 11 approved it.

---

## 9. Verification plan

Run from `client/`. These are the exact checks the acceptance criteria assert against; they are commands Samuel can re run.

- **Inline style and hex trend.** `grep -rEo "style=\{\{" src | wc -l` (baseline 2,264) and `grep -rEoi "#[0-9a-f]{3,8}\b" src | wc -l` (baseline 1,162) before and after each P workstream; both must fall substantially, near zero in migrated files.
- **Palette copies.** `grep -rl "const FLAME" src | wc -l` (baseline 31) and `grep -rl "const MUTED" src | wc -l` (baseline ~40) must fall toward 0.
- **Legacy naming.** `grep -rEi "coral|glow-coral|orange" src client/tailwind.config.js | wc -l` (baseline 126) toward 0.
- **cn / class tools adopted.** `grep -rl "tailwind-merge\|clsx" src | wc -l` greater than 0 (baseline 0).
- **Haptics adopted.** `grep -rl "@capacitor/haptics" src | wc -l` greater than 0 (baseline 0).
- **Coach de bootstrapping.** `grep -rEc "bg-gray-(800|900)|blue-600|red-600" src/pages/coach` must be 0 on the four named pages.
- **Dead primitive CSS.** `grep -rc "k-badge\|k-tag\|k-pos-badge\|k-icon-btn\|k-display\|score-badge" src` — each either non zero (adopted) or the class removed from `index.css`.
- **Loading states.** `grep -rEo "\"Loading\\.\\.\\.\"" src | wc -l` (baseline 22) falls; skeleton import breadth rises.
- **Shells transition.** Confirm no bare `<Outlet />` remains in `CoachLayout.tsx` and `ParentLayout.tsx`.
- **Tap targets and focus (visual/manual).** On device (iOS via `npm run mobile:ios`) and in browser: every button ≥44px, visible focus ring on keyboard nav, haptic fires on tab change and parent Approve/Deny, page transitions on all three shells, skeletons on cold load (no wall of zeros on `CoachDashboard`), and the five signature moments demoable.
- **Regression.** `npm run lint`, `npx tsc --noEmit`, `npm run test` all green.
- **Screenshot diff (manual).** Because layout is frozen, before/after screenshots of each migrated page should differ only in polish (color/spacing/type consistency, states, motion), never in structure. Any structural diff is a bug.

---

## 10. Sequencing

1. **F + C first** (foundation + primitives). Nothing migrates clean until the tokens and primitives exist. Land these with tests before any P work.
2. **M + S** (motion + states systems) next, since P consumes them.
3. **P1 (public gate)** ships first of the migrations, since it is the pre launch face and the smallest surface, and doubles as the proof that the system works end to end on real screens.
4. **P2 (athlete core loop)**, then **P3 (coach de bootstrapping)**, then **P4 (parent)**.
5. **G (signature moments)** layered onto each hero screen as its P migration lands (Rankings/PlayerProfile/Onboarding in P2, ComingSoon in P1, native press throughout via M3).
6. **A** enforced continuously and audited at the end.

Each P workstream is independently shippable and independently verifiable, so this can land incrementally behind the existing pre launch lockdown without a big bang.

---

## 11. Open decisions

1. **Signature vs mechanical.** This PRD includes section 7 signature moments because pure mechanical polish will not clear the "award winning" bar. If Samuel wants the strictly mechanical version, cut section 7 and G; F/C/M/S/P/A still deliver the consistency and "feels real" foundation. Default: keep section 7.
2. **New deps.** Default is zero new deps. If the token/variant ergonomics warrant `class-variance-authority` (for `Button`/`Badge` variant APIs) or a token generator, that is a small, optional add to approve here, not assume.
3. **`coral` alias sunset.** Whether to do the `coral` to brand name rename as one big-bang pass or keep a temporary Tailwind alias and remove it in a follow up. Default: keep the alias during migration, remove it in a final cleanup commit.
4. **Migration granularity.** Whether each P sub surface is one PR or several. Default: one PR per P workstream (P1..P4) plus one for F+C and one for M+S, so review stays reviewable.

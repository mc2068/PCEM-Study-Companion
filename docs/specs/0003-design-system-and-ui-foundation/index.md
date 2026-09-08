# 0003. Design system and UI foundation

**Date**: 2026-09-08
**Status**: In Progress (build complete; verify.md rows 6 to 8 need the engineer)

## Summary

This spec builds the visual foundation every screen of the app will use: color tokens measured from the approved design system sheet, a semantic light and dark theme, seven base components, a French style tile page at /design, and a design.md guide. The colors are not guesses: they were extracted from your generated design sheet pixel by pixel (deep indigo #444ad4, warm amber #f5a41b, sage green #23b189, gentle red #eb4c49 on a warm off-white #fdfaf6). Contrast pairings are pre-decided where white on a color would fail accessibility. After this, every UI slice assembles screens from proven pieces instead of inventing a look.

## Requirements

**User stories**:
- As an engineer building a screen, I want tokens and base components that already match the approved designs so that I assemble interfaces instead of styling from scratch.
- As a student using the app at night, I want a dark theme that follows my system or my choice without a flash of the wrong theme.
- As a student using a keyboard or a screen reader, I want every control operable and visible focus so that studying works for me.

**Acceptance criteria** (the contract):
- **AC-1**: Design tokens live as CSS variables in globals.css through Tailwind v4 @theme: the semantic set (background, surface, text, muted text, border, ring, primary, primary hover, accent, accent hover, success, error, disabled background, disabled text), a radius scale (8, 12, 16, 24, full), a two level shadow scale, and the Geist font variables; Tailwind v4 class dark mode is wired via `@custom-variant dark (&:where(.dark, .dark *))` and the scaffold's prefers-color-scheme block is removed; the token block uses `@theme inline`.
- **AC-2**: Every semantic text and interactive color pair meets WCAG 2.1 AA (4.5 to 1 body, 3 to 1 large and UI) in both themes, enforced by `scripts/design/check-contrast.mjs` as a hard gate (no warnings escape); contrast-safe pairings are pre-decided: on amber and sage fills text uses the dark slate (#323c4b on amber ≈ 5.4 to 1), the red button darkens to #c93835 for white text, amber and sage as text on light use darkened variants (#a86e00, #177e5f).
- **AC-3**: next-themes is wired inside ClerkProvider in layout.tsx (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`) with `suppressHydrationWarning` on `<html>`, so system theme is default, manual choice persists, and there is no flash of the wrong theme.
- **AC-4**: The base set exists in `src/components/ui`: Button (variants primary, secondary, ghost, accent; sizes sm, md, lg; loading state with spinner and disabled; disabled state; polymorphic to Next Link via href), Input, Textarea (same tokens as Input), Card, Badge (variants primary, success, warning, danger, neutral; tinted background with strong text; rounded full chip shape optional), Switch (Radix; label association; sizes sm, md), Tabs (Radix; underline variant, controlled), Progress (value prop, label slot for «12 / 40», indeterminate pulse for processing), and a styled native `<select>` for module dropdowns (Radix Select deferred until a screen needs more).
- **AC-5**: Switch and Tabs are fully keyboard operable with correct ARIA roles (Space and Enter toggle the switch; arrow keys move tab focus), every interactive component shows a visible focus ring (2px primary at 2px offset, via the ring token), and Radix state styling uses data-state selectors.
- **AC-6**: All transitions respect prefers-reduced-motion via a global `@media (prefers-reduced-motion: reduce)` rule zeroing durations; nothing transitions longer than 200 ms otherwise.
- **AC-7**: A `/design` route (`src/app/design/page.tsx`, covered by the proxy catch all like every route) renders the living style tile: every component, every variant, both themes, French labels.
- **AC-8**: `docs/design/design.md` documents the type scale (Tailwind v4 defaults, confirmed at pixel verification), the color system with the measured light anchors and the re-tuned dark values, spacing on a 4 px grid, radii, shadows, motion rules, French micro typography (guillemets with non breaking spaces, typographic apostrophes, ellipsis, accented capitals), the composed patterns (callout, dashed drop zone, empty state, progress ring), the bottom nav token pairs (component deferred to Slice 1), the Clerk appearance mapping for the hosted sign in screen, and a mapping of every approved screen design to its components and tokens.
- **AC-9**: No component code contains raw hex colors; grep finds hex values only in globals.css (tokens) and the two design scripts (extract-palette.mjs, check-contrast.mjs).

## Decision

**Chosen option**: A token first system in Tailwind v4 @theme with a semantic two theme layer, Radix backed interactive primitives, lucide icons, and a /design proof route (see `rationale.md`).

**Implementation skills**: no installed community skill governs styling; the Clerk suite governs gating the /design route and the hosted sign in appearance (conventions already in AGENTS.md).

## Feature design

**Data model sketch**: none. This feature stores nothing. The only persisted state is the theme choice, kept by next-themes in localStorage under its own key. No schema change.

**State transitions**: theme resolution: system (default) → light or dark follows the OS until the student picks manually, then the choice persists and wins until cleared.

**API surface**: none. One page route (`/design`, static composition) plus a shared `cn()` helper at `src/lib/cn.ts`. No server actions, no endpoints.

| Action | Value produced / displayed | Source |
|---|---|---|
| Any component color | semantic token value | CSS variables in globals.css (AC-1), dark values swapped by .dark class (AC-3) |
| Dark theme values | the re-tuned palette (named below) | decided here, marked "re-tuned, not measured" (the sheet is light only) |
| Contrast proof | pass or fail per pair | `scripts/design/check-contrast.mjs` regex parses the :root and .dark blocks of globals.css and evaluates the fixed pair matrix (AC-2) |
| Theme resolution | light or dark at load | next-themes class strategy + system (AC-3) |
| Style tile labels | French strings | hardcoded per AGENTS.md section 7 (no i18n layer in scope) |
| Component variants | prop driven classes | component files in src/components/ui (AC-4) |
| Icons | lucide-react named icons, colored by currentColor | lucide-react package (AC-4) |
| Screen mapping in design.md | component and token names per screen | the nine approved PNGs in docs/design/UI designs (sheet plus eight screens; the four later prompts have no generated PNG yet) (AC-8) |

**The token set** (the build implements this exactly):

- Light (measured from the sheet): background #fdfaf6, surface #ffffff, muted surface #f4f4f4, text #323c4b, muted text #5c6675 (derived tint of the slate), border #e6e9ed, primary #444ad4 (hover #334caa), accent #f5a41b (hover #d98f0f), success #23b189 (hover #1d9a76), error #eb4c49 (button fill #c93835 for white text), amber and sage text variants #a86e00 and #177e5f, ring = primary, disabled surface #f4f4f4, disabled text #9aa3ad.
- Dark (re-tuned, not measured): background #1b2028, surface #242b35, muted surface #2d3540, text #f2ede4 (warm off-white), muted text #a9b1bd, border #363f4b, primary #6d73e8 (hover #8489ee), accent #f5a41b (unchanged; dark text pairs with it), success #2fbf95 (hover #45c9a4), error #f0625f (hover #f57d7a), ring = primary, disabled surface #2d3540, disabled text #6b7480.
- Full 50 to 950 ramps are generated around the measured anchors; components consume only the semantic names above.

**Key invariants**:
- Components never hardcode colors; they consume semantic tokens (AC-9), so dark mode needs no component changes.
- The measured anchors stay traceable: each anchor token carries a comment naming the value extracted from the sheet; dark values carry "re-tuned, not measured".
- Contrast pairings are pre-decided (AC-2 list); the contrast script is a hard gate in the build, not advisory.
- Reduced motion off means no transition longer than 200 ms anywhere.
- All copy on /design is French, with the micro typography rules of design.md.

**Security model**: the /design route sits behind the Clerk wall like everything else (no public surface, nothing to index, no SEO work). No secrets, no new env vars, no data access. The design scripts read local files only and live in scripts/design.

**Configuration required**: none. next-themes needs no environment variable; Radix and lucide are code dependencies only.

**Critical test scenarios**:
- Happy path: opening /design signed in shows the full tile in the system theme; toggling the theme class swaps every token with no flash on reload, verifies AC-3, AC-7
- Keyboard: tabbing to the Switch and pressing Space flips it; arrow keys move between Tabs and the panel follows, verifies AC-5
- Contrast: the script fails the build on any pair under 4.5 to 1 (body) or 3 to 1 (large or UI) in either theme, verifies AC-2
- Motion: with prefers-reduced-motion set, transitions collapse to near zero, verifies AC-6
- Purity: grep for hex colors outside globals.css and the two design scripts returns nothing, verifies AC-9

## Build plan

Tracer Bullet ordering: tokens first (the thread every piece hangs on), then the theme mechanism, then components proving the tokens, then the tile proving the components, then the written guide.

1. Install dependencies: next-themes, @radix-ui/react-switch, @radix-ui/react-tabs, lucide-react, clsx, tailwind-merge, satisfies **AC-3**, **AC-4**
2. Write the token layer in globals.css: semantic variables with the measured anchors and the re-tuned dark values, the full semantic set including ring and disabled tokens, `@custom-variant dark`, `@theme inline`, removal of the prefers-color-scheme block, radius, shadow, and motion scales, satisfies **AC-1**, **AC-2**
3. Wire ThemeProvider inside ClerkProvider in layout.tsx with the class strategy and suppressHydrationWarning on html, satisfies **AC-3**
4. Add the cn() helper at src/lib/cn.ts (clsx plus tailwind-merge), satisfies **AC-4**
5. Build the base set in src/components/ui: Button, Input, Textarea, Card, Badge, Switch (Radix), Tabs (Radix), Progress, styled native select, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-9**
6. Build the /design proof route rendering the full tile in both themes with French labels, satisfies **AC-7**
7. Add `scripts/design/check-contrast.mjs` (regex parses globals.css, evaluates the fixed pair matrix, exits nonzero on failure) and run it on both themes, satisfies **AC-2**
8. Write docs/design/design.md (systems, rules, composed patterns, Clerk appearance mapping, screen mapping for the nine approved PNGs), satisfies **AC-8**
9. Run the checks: npx tsc --noEmit, npm run lint, npm test, contrast gate, purity grep, manual /design pass in both themes, satisfies **AC-1** through **AC-9**

## Consequences

**Positive**:
- Every later screen assembles from proven, accessible pieces; Slice 1 stops being a styling project.
- Dark mode exists at the foundation, so no screen ships light only and gets retrofitted.
- The measured palette is the single visual truth; drift between PNGs and code becomes greppable.

**Negative / tradeoffs**:
- next-themes and two Radix packages enter the dependency tree with their update cadence.
- Tokens constrain future screens: a design the tokens cannot express means a token change first (deliberate friction).
- The /design route is a permanent page to keep compiling and current.
- Pixel fidelity against the PNGs is verified by the engineer at each slice: the implementing model has no vision, a limitation stated up front rather than discovered at review.
- Dark values are re-tuned, not measured: they are consistent siblings of the measured palette but the engineer should eyeball them against taste at the first /design pass.

**Neutral**:
- The theme toggle UI itself arrives with the first screen that owns a header; the mechanism and the tile exist now.
- Light mode is the default; the dark values are re-tuned for contrast rather than inverted, so the two themes are siblings, not mirrors.
- The hosted Clerk sign in screen is styled through Clerk appearance props, not these tokens directly; design.md records the mapping.

## Follow-up

- [ ] After acceptance: link spec 0003 into scope row 4 and tick its Design it box
- [ ] Pixel verification of each screen against its PNG happens in that screen's slice with the engineer (the implementing model cannot see images)
- [ ] Screens 9 to 12 (per ui-image-prompts.md) have no generated PNG yet; generate or drop them before their slices
- [ ] /sync updates AGENTS.md section 3 to point at design.md once it exists
- [ ] Revisit the Radix dependency set if a screen needs a popover, dialog, or Select later (extend, do not swap)

## Rationale

Reasoning and options: see `rationale.md`.

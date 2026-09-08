# 0003 rationale — design system and UI foundation

## Context

Scope row 4 promises the visual language and base components for a calm, focused, French first interface, and every slice after it builds on that language. The engineer already generated the DNA: a design system sheet plus nine screen mockups from the style block in ui-image-prompts.md (deep indigo primary, warm amber for streaks, sage green for success, gentle red for errors, warm off-white background, dark slate text). The app shell today ships the Next.js default palette, so any screen built now would invent its own colors and be restyled later. The premise held up under scrutiny: this is one coherent decision (the foundation), not several; the screens themselves belong to their own slices. One honest constraint shapes the plan: the implementing model has no image input, so the palette was extracted from the approved sheet by decoding the PNG and clustering its flat color regions, and pixel level fidelity per screen is verified with the engineer at each slice.

## Options considered

### Option 1: Token first system in Tailwind v4 @theme (chosen)

Colors, radii, shadows, and fonts as CSS variables in globals.css under @theme, with a semantic layer (background, surface, primary, and so on) whose values swap for dark mode under a .dark class. Radix primitives under the hood for the interactive pieces, lucide for icons, a /design route as the living proof.

**Pros**:

- One source of truth; Tailwind v4 generates the utilities from the variables with no config file.
- Dark mode is a value swap, not a component rewrite.
- Radix carries the keyboard and ARIA burden for Switch and Tabs, which is exactly the acceptance bar chosen.

**Cons**:

- Two small runtime dependencies (next-themes, Radix pieces) plus lucide.
- Component code must stay disciplined: any raw hex sneaking in breaks the dark mode invariant.

### Option 2: Flat tokens only, no semantic layer

Keep the ten measured colors as direct utilities (bg-indigo, text-amber) and skip the naming layer.

**Pros**:

- Marginally less indirection; the measured values are right there in the class names.

**Cons**:

- Dark mode becomes a find and replace across every component, the exact churn this spec exists to prevent.
- States (hover, tint, border) have nowhere principled to live.

### Option 3: design.md as the only token home

Write the guide, keep colors as literals in components, trust review to keep them consistent.

**Pros**:

- Zero dependency and zero CSS architecture to learn.

**Cons**:

- Nothing enforced; every screen re interprets the guide, and the drift the scope row warns about arrives by default.

The engineer additionally directed that the design system sheet itself be the source (custom answer in round 1), which decided the method: extract the sheet's real values rather than author new ones. Dark mode in both themes now was also the engineer's explicit choice over the recommended light only v1, accepting the doubled verification surface; the token layer exists precisely to keep that cost low.

## Rationale

Three forces drove Option 1. First, the acceptance bar the engineer chose (AA contrast, keyboard, visible focus) is a11y machinery, and Radix ships that machinery tested; hand rolling it would spend the budget re solving solved problems (the runner up, pure hand rolled components, wins only on dependency count, and two small packages is a cheap price). Second, the dark mode decision needs a semantic layer to be cheap at all: with tokens, dark is thirty variable values; without, it is every component. Third, the measured sheet anchors mean the tokens are not taste, they are traceable artifacts of the approved design, which is why AC-9 makes raw hex in components a build failure. lucide-react over heroicons came down to catalog breadth for the nine screens (badges, nav, upload, timer, streak flame all covered) at the same maintenance cost; the hand inlined set was rejected because fifteen bespoke SVGs are slower to build and to keep consistent. Geist Sans was confirmed (already wired in the scaffold, excellent French diacritics) over Inter (a second font for marginal warmth) and the system stack (no identity). The RECOMMEND calls settled here: radius scale 8, 12, 16, 24 px (cards 16, sheets 24, controls 8, pills full); two shadow levels (rest, lift) both soft and warm tinted; a 4 px spacing grid; motion 150 to 200 ms ease out gated by prefers-reduced-motion; cn() via clsx plus tailwind-merge (the standard composition helper); base components live in src/components/ui (cross feature, unlike src/features screens); French hardcoded with no i18n layer until scope says otherwise.

## References

**Project sources** (verifiable, in this repo):

- `docs/design/UI designs/0. Design system sheet….png` and the eight screen PNGs (the approved visual DNA)
- `docs/design/ui-image-prompts.md` (the style block naming the color families and mood)
- `scripts/design/extract-palette.mjs` (the extraction that produced the anchors: #444ad4, #f5a41b, #23b189, #eb4c49, #fdfaf6, #323c4b)
- `docs/scope/scope.md` row 4 (the feature this spec executes)
- `AGENTS.md` sections 3, 5, 7 (reference fidelity, boundaries, French first)

**Practices & standards**:

- Tailwind v4 @theme CSS variable tokens (the framework's native token mechanism)
- WCAG 2.1 AA contrast (4.5 to 1 body, 3 to 1 large and UI)
- Radix primitives accessibility patterns (keyboard and ARIA for controls)
- The copy in component model (own your component code, style with your tokens)
- next-themes class strategy (no flash of wrong theme on SSR apps)

## Post cross check record

The independent cross check (fresh context review, 2026-09-08) returned 21 gaps and 5 soundness notes; all were accepted and folded into the spec. The load bearing ones: white on the amber and sage fills fails AA by a wide margin, so contrast pairings are now pre-decided (dark slate text on amber and sage, a darkened red button fill, darkened amber and sage text variants) and the contrast script became a hard gate instead of an advisory; Tailwind v4 needs `@custom-variant dark`, `@theme inline`, and the removal of the scaffold's prefers-color-scheme block or class dark mode silently breaks at the CSS layer; the dark palette needed actual starting values (now named in the spec and marked re-tuned, not measured) rather than a promise; layout.tsx needed `suppressHydrationWarning` and specific ThemeProvider props; the component set gained API specifics (Button sizes, loading, link polymorphism; Badge variants; Progress indeterminate; Textarea; a styled native select for module dropdowns); design.md gained the composed patterns (callout, drop zone, empty state, progress ring), the Clerk appearance mapping for the hosted sign in screen, and French micro typography rules; and the screen count was corrected to the nine PNGs actually approved (the later prompts have no generated image yet).

# design.md — Système de design (spec 0003)

**Status**: In Progress (build) · **Source**: `docs/design/UI designs/` — the
approved design-system sheet, palette extracted pixel-exact by
`scripts/design/extract-palette.mjs`. **Tokens**: `src/app/globals.css` (single
source of truth — change tokens there, never in components).

## 1. Color system

### 1.1 Measured anchors (light, from the sheet)

| Role           | Token                       | Hex                   | Notes                                              |
| -------------- | --------------------------- | --------------------- | -------------------------------------------------- |
| Background     | `background`                | `#fdfaf6`             | warm off-white, page base                          |
| Surface        | `surface`                   | `#ffffff`             | cards, inputs, sheets                              |
| Surface muted  | `surface-muted`             | `#f4f4f4`             | soft fills, secondary button                       |
| Text           | `text`                      | `#323c4b`             | dark slate, body + headings                        |
| Text secondary | `muted-text`                | `#5c6675`             | derived tint of the slate                          |
| Border         | `border`                    | `#e6e9ed`             | decorative reinforcement, never the sole indicator |
| Primary        | `primary` / `primary-hover` | `#444ad4` / `#334caa` | indigo, both measured                              |
| Accent         | `accent` / `accent-hover`   | `#f5a41b` / `#ffbb33` | amber; hover lighter (see pairing rule)            |
| Success        | `success` / `success-hover` | `#23b189` / `#2fc39a` | sage                                               |
| Error          | `error`                     | `#eb4c49`             | red; UI edge/icon and tint base                    |

Dark theme values (re-tuned siblings, not measured — chosen for AA + mood, light
`#f2ede4` warm off-white text on `#1b2028`) live in the `.dark` block of
globals.css. **Pairing rules (pre-decided, gated by `npm run check:contrast`)**:

- Fills of amber and sage always pair with the dark slate (`on-accent`, `on-success`), never white (white on amber ≈ 2.1:1, on sage ≈ 2.7:1 — fails).
- Red button fills use `error-strong` (`#c93835`) for white text.
- Informative amber/sage text and icons use `accent-text` / `success-text`; raw `accent`/`success` on light are for fills and decoration only.
- Disabled pairs are WCAG-exempt (not gated); borders sit below 3:1 by design and never carry meaning alone.

Tints (`primary-tint`, `accent-tint`, `success-tint`, `error-tint`) back badges
and callouts. Full 50–950 family ramps are deferred (follow-up in spec 0003):
static anchor overrides exist (`--color-indigo-600: #444ad4`, `--color-amber-500: #f5a41b`, `--color-emerald-500: #23b189`, `--color-red-500: #eb4c49`); extend a ramp when a screen first needs one.

## 2. Typography — Geist Sans (next/font, `--font-geist-sans`)

| Use           | Classes                                 |
| ------------- | --------------------------------------- |
| Page title    | `text-2xl font-semibold tracking-tight` |
| Section title | `text-xl font-semibold`                 |
| Body          | `text-sm text-text`                     |
| Caption/meta  | `text-xs text-muted-text`               |

French micro-typography (applies to ALL copy): typographic apostrophe `’`
(U+2019), guillemets `« … »` with non-breaking spaces inside, ellipsis `…`,
accents on capitals (À, É). Never the straight `'` or three dots.

## 3. Spacing & radius

4 px grid (Tailwind default scale). Radii: controls `rounded-md` (8), cards
`rounded-xl` (16), sheets/modals `rounded-2xl` (24), pills `rounded-full`.

## 4. Shadows & motion

`shadow-rest` (cards at rest), `shadow-lift` (hover/raise). Both warm-tinted
(base `#323c4b`). Motion: 150–200 ms ease-out, nothing longer; every transition
and animation collapses under `prefers-reduced-motion` (global rule, AC-6).

## 5. Components (`src/components/ui/`)

| Component                                         | API notes                                                                                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                          | variants `primary` (indigo) · `accent` (amber) · `secondary` (soft gray) · `ghost` (indigo text); sizes `sm/md/lg`; `isLoading` (spinner + disabled + aria-busy); `disabled`; `href` renders Next `<Link>` |
| `Input` / `Textarea`                              | `label`, `error` (aria-invalid + aria-describedby wired); error state red border + message in `error-text`                                                                                                 |
| `Select`                                          | styled native `<select>` for module dropdowns (Radix Select deferred until a screen needs it)                                                                                                              |
| `Card` (+Header/Title/Description/Content/Footer) | surface + `shadow-rest`; composes freely                                                                                                                                                                   |
| `Badge`                                           | `primary` `success` `warning` `danger` `neutral`; tinted bg + strong text; icon slot (streak flame: `warning` + Flame)                                                                                     |
| `Switch` (Radix)                                  | Space/Enter toggles; `label` associated via htmlFor; sizes `sm/md`; states via `data-[state=…]`                                                                                                            |
| `Tabs` (Radix)                                    | underline variant; controlled `value`/`onValueChange`; arrow-key navigation built in                                                                                                                       |
| `Progress`                                        | linear; `value` 0–100 or omit for the indeterminate pulse; `label` slot («12 / 40»)                                                                                                                        |

All interactive components: visible 2px `ring` at 2px offset on focus-visible,
`150 ms` transitions, French-ready.

## 6. Composed patterns (documented only; build with pieces when screens need them)

- **Callout**: `bg-primary-tint` + 4px `border-l-primary` + `text-text`.
- **Drop zone**: `border-2 border-dashed border-border rounded-xl` + `bg-surface` + centered `muted-text` hint («Dépose ton PDF»).
- **Empty state**: centered icon (`muted-text`) + one-line title + ghost action («Aucun cours pour l’instant»).
- **Progress ring**: SVG circle, `stroke: var(--primary)` (not the linear Progress).
- **Bottom nav**: active item `text-primary`, inactive `text-muted-text`; component deferred to Slice 1.

## 7. Theming mechanism

next-themes (`attribute="class"`, `defaultTheme="system"`, `enableSystem`,
`disableTransitionOnChange`) inside ClerkProvider; `suppressHydrationWarning`
on `<html>`; Tailwind class dark mode via `@custom-variant dark`. The
`prefers-color-scheme` CSS block was removed (it fought the class strategy).
The proof page `/design` renders every component in the active theme with the
toggle on page.

## 8. Clerk appearance mapping (hosted sign-in screen)

The sign-in screen is Clerk-hosted `<SignIn/>`; style it through Clerk
appearance variables, not tokens-in-components:

```ts
appearance: {
  variables: {
    colorBackground: "var(--surface)",
    colorPrimary: "var(--primary)",
    colorText: "var(--text)",
    colorInputBackground: "var(--surface)",
    colorInputText: "var(--text)",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans)",
  },
}
```

## 9. Screen mapping (approved PNGs → pieces)

| #   | Design PNG                    | Key components / tokens                                                       |
| --- | ----------------------------- | ----------------------------------------------------------------------------- |
| 0   | Design system sheet (the DNA) | this whole file                                                               |
| 1   | Sign in                       | Clerk `<SignIn/>` + §8 mapping                                                |
| 2   | Dashboard / mes cours         | Card grid, Badge (module chips), Progress, empty state, bottom nav            |
| 3   | Ajouter un cours              | drop zone pattern, Select (module), Button accent, upload progress            |
| 4   | Lecture — résumé              | Tabs, Callout pattern, Badge («Nouveau»), Progress (processing)               |
| 5   | Flashcards                    | Card, Switch (reveal?), Progress «12 / 40», grade buttons = screen slice      |
| 6   | Quiz                          | option rows + grade buttons = screen slice, Badge timer, Button               |
| 7   | Exams                         | Progress ring pattern, Timer (Clock icon + Badge), error `error-strong` fills |
| 8   | Chat                          | Textarea, ghost Button, message bubbles = Card variants, Callout (citation)   |

Pixel fidelity per screen is verified against its PNG in that screen's slice
with the engineer (the implementing model has no image input).

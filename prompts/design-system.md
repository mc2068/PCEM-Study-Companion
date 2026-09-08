# Implementation prompt — design system and UI foundation

**Feature**: Design system & UI foundation (spec 0003, scope row 4)
**Date**: 2026-09-08 · **Status**: awaiting approval

## Goal

Build the visual foundation per spec 0003: the token layer (measured palette, light +
dark), the theme mechanism, nine base components, the /design proof route, a hard-gate
contrast script, and design.md — then run every check.

## Skills read

- No installed community skill governs styling; conventions come from AGENTS.md §3/§5/§7
  and spec 0003 (governing spec, just ratified). Clerk conventions for route gating are in AGENTS.md.

## Code inspected

- `src/app/globals.css`: scaffold default (Geist font vars, prefers-color-scheme dark
  block to remove).
- `src/app/layout.tsx`: ClerkProvider + lang="fr"; needs ThemeProvider + suppressHydrationWarning.
- `src/proxy.ts`: catch-all Clerk middleware covers /design (verify no route exclusions needed).
- `docs/specs/0003-design-system-and-ui-foundation/`: the contract (9 ACs).
- `scripts/design/extract-palette.mjs`: exists; stays as the palette provenance record.

## Decisions and assumptions

1. **Token architecture** exactly per spec: `:root` + `.dark` semantic variables,
   `@theme inline` mapping to utilities, `@custom-variant dark (&:where(.dark, .dark *))`,
   prefers-color-scheme block removed. Full 50–950 ramps defined as static `@theme` colors
   overriding Tailwind's default families (indigo-600 = #444ad4 etc.), documented in design.md.
2. **Component homes**: `src/components/ui/*` (cross-feature primitives; screens stay in
   src/features per AGENTS.md §5). `cn()` at `src/lib/cn.ts`. Theme provider wrapper
   (`'use client'`) at `src/components/theme-provider.tsx`.
3. **Radix scope**: only @radix-ui/react-switch and @radix-ui/react-tabs. Progress and the
   styled select are hand-rolled (spec decision). Radix state styling via data-state selectors.
4. **Button `href` polymorphism**: renders Next `<Link>` when href is passed, else `<button>`.
5. **Contrast script**: zero-dependency; regex-parses the `:root` and `.dark` blocks of
   globals.css, evaluates a fixed pair matrix, exits nonzero on any AA failure (hard gate,
   wired into the check flow; also added to npm scripts as `check:contrast`).
6. **npm install**: 6 packages (next-themes, @radix-ui/react-switch, @radix-ui/react-tabs,
   lucide-react, clsx, tailwind-merge). Sandbox now has full access (spawns proven working:
   vitest, git push); npm cache redirected into the workspace per AGENTS.md §9.
7. **Manual /design visual pass** (AC-7 pixel fidelity, both themes) stays with the
   engineer: the model has no vision; I verify the route compiles and the Clerk gate
   applies via a dev-server smoke test.

## Files to touch

| File | Change |
|---|---|
| `src/app/globals.css` | full rewrite: token layer per AC-1/AC-2 (measured anchors + re-tuned dark values, tints, state tokens, ramps, radius/shadow/motion scales, reduced-motion rule) |
| `src/app/layout.tsx` | ThemeProvider inside ClerkProvider, suppressHydrationWarning on html |
| `src/components/theme-provider.tsx` | new: 'use client' next-themes wrapper |
| `src/lib/cn.ts` | new: clsx + tailwind-merge helper |
| `src/components/ui/button.tsx` | new: 4 variants, 3 sizes, isLoading, disabled, href polymorphic |
| `src/components/ui/input.tsx` | new: label, error (aria-invalid + describedby), French-ready |
| `src/components/ui/textarea.tsx` | new: same API as Input |
| `src/components/ui/card.tsx` | new: surface container |
| `src/components/ui/badge.tsx` | new: 5 variants (tinted bg + strong text), pill shape |
| `src/components/ui/switch.tsx` | new: Radix, sm/md, label association |
| `src/components/ui/tabs.tsx` | new: Radix, underline variant, controlled pass-through |
| `src/components/ui/progress.tsx` | new: value, label slot, indeterminate pulse |
| `src/components/ui/select.tsx` | new: styled native select, label/error |
| `src/app/design/page.tsx` | new: style tile, all components/variants, French labels, theme toggle |
| `scripts/design/check-contrast.mjs` | new: AA hard gate over the token pair matrix |
| `package.json` | `check:contrast` script + 6 deps |
| `docs/design/design.md` | new: systems, rules, composed patterns, Clerk appearance mapping, 9-screen mapping |
| `docs/specs/0003-design-system-and-ui-foundation/*` | status → In Progress at build start; verify.md evidence at the end |
| `docs/scope/scope.md` | row 4 build box tick when verified |

## Requirements

Satisfies AC-1 through AC-9 of spec 0003 (mapping: AC-1/2 → globals.css + script,
AC-3 → layout/provider, AC-4/5/6/9 → components, AC-7 → /design, AC-8 → design.md).

## Security considerations

- Nothing new: no secrets, no data access; /design stays behind the Clerk catch-all (verify proxy).

## Checks to run (agent-runnable, full access sandbox)

`npm install` · `npx tsc --noEmit` · `npm run lint` · `npm test` ·
`npm run check:contrast` · purity grep (hex only in globals.css + design scripts) ·
dev-server smoke: /api/health 200, /design gated (redirect to sign-in) with no compile errors.

## Manual test steps (engineer)

1. `npm run dev`, sign in, open `/design`: tile renders all components in both themes
   (toggle on the page), French labels, focus rings visible, Switch flips with Space,
   Tabs move with arrows.
2. OS reduced-motion on: transitions collapse.
3. Eyeball dark palette vs taste (values are re-tuned, not measured).

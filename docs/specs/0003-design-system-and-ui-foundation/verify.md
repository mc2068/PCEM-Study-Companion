# Verify — Design system and UI foundation (spec 0003)

**Ran**: 2026-09-08 (agent: full access sandbox) · **Runner**: agent + engineer (manual rows)

The feature's `Done when` (scope row 4): design.md covers type, color, spacing and
base components, and base components handle focus and keyboard.

| # | Step | Command | Status | Evidence |
|---|------|---------|--------|----------|
| 1 | Types | `npx tsc --noEmit` | ✅ | exit 0 |
| 2 | Lint | `npm run lint` | ✅ | exit 0, 0 problems |
| 3 | Tests | `npm test` | ✅ | 2 passed (2) |
| 4 | Contrast both themes (hard gate) | `npm run check:contrast` | ✅ | 56/56 pairs pass (one fixed on catch: on-success light 4.10→4.69 via #2a3340) |
| 5 | Token purity | grep hex in src (excl. globals.css) | ✅ | CLEAN (scaffold page.tsx hexes swapped to tokens) |
| 6 | /design renders, both themes, French | SSR: fresh-JWT `Bearer` → 200 with full tile (Système, Indigo…); anonymous → 307 sign-in; MCP compilation issues: none | ✅ (render + gate) / ⬜ (visual both themes) | engineer: eyeball tile in light + dark |
| 7 | Keyboard: Switch Space, Tabs arrows | manual at /design | ⬜ | Radix primitives ship the key handling; one-minute check: Tab to switch, Space; arrow through tabs |
| 8 | Reduced motion honored | manual (emulate) | ⬜ | global `prefers-reduced-motion` rule zeroes all durations |

**Auth note (dev environment)**: automated signed-in browsing on localhost is
blocked by Clerk's dev-instance handshake — third-party cookies to
`clerk.accounts.dev` are restricted in Brave (shields) and the bundled Chromium,
and clerk-js resets `__client_uat` on every Clerk page load. Server-side proof
used a Backend-API-minted session JWT (`POST /sessions/{id}/tokens`, 60 s TTL)
via Bearer header; for manual browsing, turn Shields off for localhost in Brave.
Dev sessions expire after ~30 min (`POST /sessions` recreates one with the
dev user's password).
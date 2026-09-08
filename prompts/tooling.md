# Implementation prompt — /develop tooling (scope row 2)

## Goal

Make the existing toolchain run clean end to end: format gate green, hooks proven,
CI complete. The scaffold (row 1) already installed everything; this slice fixes the
known noise and closes the two gaps the /audit scan found.

## Skills read

- audit (gap-fill scan, this session): missing check commands, stale sandbox line
- sync boundaries (AGENTS.md ownership)

## Code inspected

- `.prettierrc.json`: contains `doubleQuote: true` — not a Prettier option (the real
  option is `singleQuote`; default already emits double quotes). Every run warns
  "Ignored unknown option". Pure noise, zero formatting impact.
- `.husky/pre-commit`: `lint-staged` + `tsc --noEmit` — never once exercised (earlier
  sandbox couldn't spawn children; now it can).
- `.github/workflows/ci.yml`: runs typegen, tsc, lint, test — no format gate.
- `.npm-cache/`: stale npm cache redirect from the restricted-sandbox era, untracked
  inside the repo; default cache location works again.
- `AGENTS.md` §9 sandbox line: says spawning "fails" — true only in restricted modes.

## Changes

1. `.prettierrc.json` — drop the invalid `doubleQuote` key (keep `printWidth: 100`).
2. CI — add `npm run format:check` after lint (format gate, matches row 2's done-when).
3. `.gitignore` — add `/.npm-cache/`; delete the stale folder.
4. `AGENTS.md` §9 — reword the sandbox line to the durable truth: restricted modes
   block spawning, full access works (applies to hooks too).
5. Run the full check set; exercise a real `git commit` with hooks enabled to prove
   pre-commit runs clean on this machine.

## Not doing

- No new tools, no config rewrites, no dependency changes, no editor settings.
- husky `tsc --noEmit` stays on every commit (already the engineer's chosen rig).

## Acceptance criteria

- AC-1 `npm run format:check` exits 0 with no "Ignored unknown option" warning.
- AC-2 `npm run lint`, `npx tsc --noEmit`, `npm test` all exit 0.
- AC-3 A normal `git commit` triggers husky pre-commit (lint-staged + tsc) and succeeds.
- AC-4 CI gains the format gate; push goes green.

## Checks

`npm run format:check`, `npm run lint`, `npx tsc --noEmit`, `npm test`, hooked commit,
push + CI watch.

## Manual test steps (engineer, optional)

- Next commit you make in your own terminal should show lint-staged + tsc running.

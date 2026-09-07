# Implementation prompt — tooling setup

**Feature**: Developer tooling (the `/audit` picks: section "Tooling")
**Date**: 2026-09-07 · **Status**: awaiting approval

## Goal

Install the tooling choices recorded in `/audit`: Prettier formatting, ESLint +
Prettier integration, a pre commit gate (lint + format + typecheck), Vitest with a
first passing test, and basic GitHub Actions CI on push.

## Skills read

- `/audit` skill docs (greenfield mode + agent prompt), fetched from `jsmastery-pro/skills`.
- npm registry records for prettier, eslint-config-prettier, husky, lint-staged, vitest (versions verified live).

## Code inspected

- `package.json`: npm 12, scripts block, existing devDeps (ESLint 9 present, flat config).
- `eslint.config.mjs`: scaffold flat config (will be read again before editing).
- `.gitignore` covers `.env*`; repo exists with 1 commit on `origin/main`.
- No `.github/` directory yet, no formatter config, no tests.

## Decisions and assumptions

1. **Prettier style matches the existing code** (double quotes, semicolons, print width 100) so the first format run produces near zero churn.
2. **`eslint-config-prettier`** is appended to the flat config to switch off stylistic rules that would fight Prettier.
3. **Pre commit** = `lint-staged` (eslint --fix + prettier --write on staged files) then a whole project `tsc --noEmit`, per the "lint + format + typecheck on every commit" pick. Husky v9 manages the hook.
4. **Vitest 5.0.0** with a manual path alias (`@/*` → `src/*`) in `vitest.config.ts`. The sample test imports `src/db/schema.ts` (pure, no DB connection at import time) and asserts the `students` table exists with its name. It guards the schema import path without needing secrets.
5. **CI runs lint + typecheck + test, not build.** `next build` belongs to Vercel; keeping CI secret free means it always runs green on a public PR.
6. The sandbox on this machine cannot run `npm install`, git hooks, or vitest (spawn EPERM). The agent writes every file; the engineer runs the commands in section "Manual test steps".
7. Vite's `esbuild` dependency ships a postinstall script; the engineer's npm 12 `allow-scripts` gate may hold it. The steps below include the one-line approval if vitest complains about a missing binary.

## Files to touch

| File                       | Change                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`             | add devDeps: `prettier ^3.9.6`, `eslint-config-prettier ^10.1.8`, `husky ^9.1.7`, `lint-staged ^17.5.0`, `vitest ^5.0.0`; add scripts: `format`, `format:check`, `test`, `prepare` (husky) |
| `.prettierrc.json`         | new: `{ "printWidth": 100, "doubleQuote": true }`                                                                                                                                          |
| `.prettierignore`          | new: `package-lock.json`, `.next`, `node_modules`, `drizzle/`                                                                                                                              |
| `eslint.config.mjs`        | append `eslint-config-prettier` to the config array (read first, minimal edit)                                                                                                             |
| `lint-staged.config.mjs`   | new: ts/tsx → `eslint --fix` + `prettier --write`; other types → `prettier --write`                                                                                                        |
| `.husky/pre-commit`        | new: `lint-staged` then `tsc --noEmit`                                                                                                                                                     |
| `vitest.config.ts`         | new: alias `@` → `./src`, include `src/**/*.test.ts`                                                                                                                                       |
| `src/db/schema.test.ts`    | new: sample test asserting the `students` table symbol and SQL name                                                                                                                        |
| `.github/workflows/ci.yml` | new: on push/PR to `main`, Node 22, `npm ci`, `tsc --noEmit`, `npm run lint`, `npm test`                                                                                                   |

## Requirements

- AC-1: `npm install` completes with the new devDeps.
- AC-2: `npm run format:check` runs Prettier over the repo and `npm run format` fixes drift.
- AC-3: `git commit` triggers lint-staged + typecheck; a type error blocks the commit.
- AC-4: `npm test` runs vitest and the sample test passes.
- AC-5: CI workflow file is valid YAML and runs on the next push.
- AC-6: no secret is required by any check (CI included).

## Security considerations

- CI needs no secrets (no build, no deploy). Hooks contain no credentials. Nothing client facing changes.

## Checks to run (after execution)

`npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run format:check`

## Manual test steps (engineer terminal)

1. `npm install` — expect added packages, no errors. If npm 12 asks about `esbuild` scripts: `npm approve-scripts esbuild`, then `npm rebuild esbuild`.
2. `npx husky` (once, prepares `.husky/_`).
3. `npm run format` — expect a short list of reformatted files.
4. `npm test` — expect `1 passed`.
5. `git add -A` then `git commit -m "chore: tooling setup"` — expect lint-staged + tsc output, commit succeeds.
6. `git push` — expect the `ci` workflow to start on GitHub and go green.

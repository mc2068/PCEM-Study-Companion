# Implementation prompt — data model build

**Feature**: Core relational data model (spec 0002, scope row 3)
**Date**: 2026-09-07 · **Status**: awaiting approval

## Goal

Turn spec 0002 into a live database: the full Drizzle schema (11 tables, 5 enums,
checks, uniques, indexes), the migration applied to the live Supabase project, an
idempotent seed, and verification probes proving the load-bearing invariants.

## Skills read

- `ai-sdk` not needed here; no AI surface in this feature.
- Build flow per the develop skill (already internalized): Tracer Bullet ordering,
  spec status advance on build start, verify steps from the spec.

## Code inspected

- `src/db/schema.ts`: today holds only the `students` table (pipe-proof era) — full rewrite incoming.
- `scripts/db/pipe-proof.mjs` + `scripts/storage/create-bucket.mjs`: the socket-script
  pattern that runs in this sandbox (pure node I/O, no child processes).
- `.env.local`: pooled `DATABASE_URL` live and proven (2026-09-07).
- `package.json`: `db:*` scripts exist; drizzle-kit is installed but its CLI spawns
  child processes (esbuild), which this sandbox blocks (spawn EPERM).

## Decisions and assumptions

1. **Migration path is dual.** Primary: a hand-written DDL socket script
   (`scripts/db/migrate-0002.mjs`) executes the exact DDL from the spec ERD, in
   dependency order, via the proven in-process socket route — this lets the whole
   build verify autonomously. Canonical reconciliation: the engineer may also run
   `npm run db:push` (drizzle-kit) in their terminal; if DDL and schema match, it is
   a no-op, and any drift it reports gets fixed in `schema.ts` (source of truth).
2. **DDL ↔ schema equivalence is a stated risk** (drizzle naming details like enum
   labels and check names can differ); mitigation: verify script probes the real
   database, and drizzle-kit push reconciles any cosmetic drift.
3. **Dates**: `reviewed_day` is a plain `date` column (mode string in Drizzle).
4. The existing `schema.test.ts` stays valid (`students` export persists); it gains
   one more assertion (eleven table exports) in the same edit pass.
5. Seed student id uses a stable fake Clerk id (`user_demo_seed`) — the Clerk id
   space is text, so no collision risk with real auth ids.

## Files to touch

| File | Change |
|---|---|
| `src/db/schema.ts` | full rewrite: 11 tables, pgEnums (lecture_state, chunk_status, review_grade, usage_kind, chat_role), FKs with cascade / set-null, uniques (email; student+name; student+storage_path; lecture+chunk_index; lecture+card position; lecture+question position; student+card+day; attempt+question), checks (semester, options length 4), indexes (due cards, heatmap, attempts, usage, chat) |
| `scripts/db/migrate-0002.mjs` | new: the same DDL, hand-written, executed in order via socket; idempotent guards (IF NOT EXISTS / DO blocks) |
| `scripts/db/seed-demo.mjs` | new: demo student + Semester 1 module, idempotent (ON CONFLICT DO NOTHING) |
| `scripts/db/verify-schema.mjs` | new: probes for AC-1 (11 tables), AC-3 (cascade), AC-9 (snapshot survives question delete), AC-10 (day dedupe violation), AC-2-shape (options CHECK), quota count query |
| `src/db/schema.test.ts` | extend: assert the 11 table exports exist |
| `docs/specs/0002-data-model/verify.md` | statuses updated with evidence |
| `docs/specs/0002-data-model/index.md` | status Proposed → In Progress at build start |

## Requirements

Satisfies AC-1 through AC-10 of spec 0002 (mapping: AC-1/4/5/6/8/10 → schema+DDL,
AC-2 → schema.ts + tsc, AC-3/9 → DDL + cascade probe, AC-7 → seed).

## Security considerations

- No new secrets; scripts read `DATABASE_URL` from `.env.local` via `--env-file`.
- Service-role-level access stays in scripts and server code only; nothing client facing changes.

## Checks to run (agent-runnable)

`npx tsc --noEmit` (in-process) · `node --env-file=.env.local scripts/db/migrate-0002.mjs` ·
`... seed-demo.mjs` (twice, idempotence) · `... verify-schema.mjs`

## Manual test steps (engineer terminal, optional but recommended)

1. `npm run db:push` — expect "No changes detected" (or reconcile the cosmetic drift it names).
2. `npm test` — expect the schema test green.
3. Supabase dashboard → Table editor: eyeball the 11 tables.

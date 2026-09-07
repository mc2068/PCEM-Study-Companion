# Verify — Stack & architecture (spec 0001)

**Ran**: 2026-09-07 · **Runner**: agent sandbox + engineer terminal

The feature's `Done when` (scope row 1): stack recorded in a spec ✓ · scaffold boots
locally · passes build · deploys to a live URL.

| # | Step | Command | Status | Evidence |
|---|------|---------|--------|----------|
| 1 | Dependencies install cleanly | `npm install` | ✅ | 413 packages, 1m (2026-09-07); all versions verified against registry.npmjs.org that day |
| 2 | Production build compiles | `npm run build` | ✅ (compile phase) | Turbopack: "Compiled successfully in 9.6s" in sandbox; full build incl. type-check subprocess runs in engineer terminal |
| 3 | Type-check passes | `npx tsc --noEmit` | ✅ | exit 0 |
| 4 | Dev server boots | `npm run dev` → open http://localhost:3000 | ✅ | engineer confirmed 2026-09-07 ("boots") |
| 5 | Health endpoint answers | http://localhost:3000/api/health | ✅ | confirmed with step 4 |
| 6 | Live deploy | push to GitHub → import in Vercel | ⬜ blocked on engineer's GitHub repo | needs repo URL + Vercel import |
| 7 | Database connection (Supabase pooled 6543) | `node --env-file=.env.local scripts/db/pipe-proof.mjs` | ✅ | `CONNECTED: {"db":"postgres","students":0}` — table created live, 2026-09-07 |
| 8 | Storage bucket + signed upload path (fix #1 mechanism) | `node --env-file=.env.local scripts/storage/create-bucket.mjs` | ✅ | bucket `lectures` private/25MB/PDF-only created; signed upload URL issued (200), 2026-09-07 |

**Known warnings at install** (recorded, non-blocking): deprecated transitive deps
(@esbuild-kit → tsx merge, crypto-js via QStash, eslint 9.39.5 supported-version
notice); 4 moderate audit findings — **do not run `npm audit fix --force`** (major
upgrades); 5 postinstall scripts gated by engineer's npm allow-scripts policy
(esbuild ×3, unrs-resolver, core-js — verifiers/no-ops, only approve if a build
complains about a missing binary).

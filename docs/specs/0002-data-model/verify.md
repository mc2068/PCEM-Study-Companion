# Verify � Data model (spec 0002)

**Ran**: 2026-09-07 � **Runner**: agent (socket scripts, in-process)

| #   | Step                                | Command                                                   | Status | Evidence                                                                                                                 |
| --- | ----------------------------------- | --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Schema type checks                  | `npx tsc --noEmit`                                        | ?      | exit 0                                                                                                                   |
| 2   | Migration applies live              | `node --env-file=.env.local scripts/db/migrate-0002.mjs`  | ?      | 11 tables listed, exit 0                                                                                                 |
| 3   | All eleven tables exist in Supabase | `node --env-file=.env.local scripts/db/verify-schema.mjs` | ?      | PASS AC-1, 11 tables found                                                                                               |
| 4   | Seed is idempotent                  | `seed-demo.mjs` run twice                                 | ?      | {"student":"1","modules":"1"} both runs                                                                                  |
| 5   | Cascade proof (no orphans)          | verify-schema.mjs                                         | ?      | PASS AC-3                                                                                                                |
| 6   | Quota count query works             | verify-schema.mjs                                         | ?      | PASS AC-8, count = 0                                                                                                     |
| 7   | Options CHECK rejects 3 options     | verify-schema.mjs                                         | ?      | PASS AC-2                                                                                                                |
| 8   | Same-day review dedupe              | verify-schema.mjs                                         | ?      | PASS AC-10                                                                                                               |
| 9   | Snapshot survives question delete   | verify-schema.mjs                                         | ?      | PASS AC-9                                                                                                                |
| 10  | db:push reconciliation              | `npm run db:push`                                         | ?      | crashed once on drizzle-kit bug #5599 (internal-schema introspection); fixed via schemaFilter: ["public"]; rerun pending |

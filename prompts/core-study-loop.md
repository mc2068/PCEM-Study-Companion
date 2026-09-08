# Implementation prompt — core study loop (spec 0004)

Executed 2026-09-08. Build contract: `docs/specs/0004-core-study-loop/index.md`.
Standing directive applied: engineer pre-approved autonomous execution
("do it by yourself you have the skills and all what you need").

## Goal

Build the slice 1 walking skeleton end to end: Clerk-gated app, PDF upload with
presigned direct-to-storage, QStash chunked pipeline (prepare → chunk → merge)
with Gemini structured output, and the three study surfaces (Résumé,
Flashcards, Quiz) per mockups 2–6 in `docs/design/ui-image-prompts.md`.

## Skills read

- develop (`flow/build.md`, `logical-guide.md`, `ui-guide.md`, `ui/implementation.md`)
- ai-sdk (v7: `generateObject` + Zod, PDF file parts `{ type: 'file', data, mediaType }`,
  `abortSignal`)
- AGENTS.md §2–§10; spec 0004 (build sections only); `docs/design/ui-image-prompts.md`
  (image source of truth; PNGs not readable by this model)

## Code inspected before building

- `src/db/index.ts` (server-only pooled client, `prepare: false`)
- `src/db/schema.ts` (11 tables; summary jsonb shape `{ summary, key_concepts }`;
  no relations declared — matters, see bugs)
- `scripts/storage/create-bucket.mjs` (presign request shape, bucket caps)
- `src/app/layout.tsx`, `src/app/design/page.tsx` (Clerk provider, page gating pattern)
- `src/components/ui/*` (Button polymorphic href, Badge variants incl. `warning`,
  Progress `{value,label}`, Select native) — reused, nothing new invented
- `src/proxy.ts` (bare clerkMiddleware → replaced with route matcher + protect)
- `.env.example` (added `QSTASH_ENDPOINT`)

## Decisions

- **UI route**: reproduce mockups from `ui-image-prompts.md` exact page prompts
  (read_image unavailable on this model); responsive down to mobile per AGENTS.md §3.
- **Student provisioning**: lazy `ensureStudent()` upsert on first authenticated
  request (no Clerk webhook in this slice) + per-student "Cours généraux" module.
- **Chunk inference**: pdf-lib slices the stored PDF into 5-page sub-PDFs; each
  sub-PDF goes to Gemini as a native file part (no text extraction dependency).
- **Merge claim**: one conditional `UPDATE ... WHERE processing AND processed=total`
  guards the single merge; `onConflictDoNothing` on (lectureId, position) makes
  card/question replay a no-op.
- **Retry**: prepare resets `failed` chunks → `pending` before publishing; done
  chunks keep cached output (AC-6).
- **Summary stored** as `{ summary, key_concepts }` to match the schema comment shape.

## Files

- `src/features/study/`: constants.ts (pipeline numbers + all French copy),
  schemas.ts (Zod AI outputs + job payloads), student.ts, storage.ts, qstash.ts,
  queries.ts, actions.ts, grades.ts, pipeline.ts, gemini.ts,
  upload-form.tsx, lecture-header.tsx, flashcard-study.tsx, quiz-view.tsx
- `src/app/`: page.tsx (home), upload/page.tsx, lectures/[id]/page.tsx,
  api/pipeline/qstash/route.ts
- `src/components/`: bottom-nav.tsx, posthog.tsx, posthog-events.tsx
- `src/db/schema.ts`: untouched (no new tables)
- `src/proxy.ts`: `auth.protect()` with public matcher (sign-in/up, health, webhook)
- Scripts: `scripts/db/live-fire-probe.mjs`, `scripts/db/live-fire-check.mjs`,
  `scripts/db/reset-merge-state.mjs`, `scripts/pipeline/signed-delivery-probe.mjs`
  (QStash-format HS256 signed delivery simulator)

## Requirements → AC map

- AC-1 gate: proxy.ts protect; anonymous → 307 Clerk host (verified local + prod)
- AC-2 createUpload: cap check before row, PDF/25 MB validation, presigned PUT
- AC-3 upload form: mockup 3 (dropzone, module select, semester tag, disclosure)
- AC-4 finalizeUpload: atomic uploaded→processing claim gates usage event + publish;
  cap re-check; prepare worker pdf-lib parse + chunk plan
- AC-5 chunk workers: generateObject, Zod-validated ≤20 cards / ≤5 questions,
  conditional pending→done carries output; processed_chunks increments only there
- AC-6 retry + reaper: failed→processing claim; prepare resets failed chunks;
  reaper-on-read (10 min chunk / 10 min zero-progress / 30 min uploaded)
- AC-7 lecture page: mockup 4 (module label, summary paragraphs, indigo concept
  callouts, tabs), 5 s polling while processing
- AC-8 flashcards: mockup 5 (one card, Révéler, 4 grades); SM-2 constants from spec;
  duplicate day = silent no-op via unique triple + onConflictDoNothing
- AC-9 quiz: mockup 6 (counter, A–D single select, Valider, explanation reveal)
- AC-10 daily cap: 10/day per student timezone, pre-create + finalize re-check
- AC-11 deploy: verified on pcem-study-companion.vercel.app (below)
- AC-12 disclosure: Gemini free-tier usage text on the upload form

## Security

- Service key only in server modules; browser receives exactly one presigned URL
  scoped to `{studentId}/{lectureId}.pdf`
- Webhook signature-verified (both signing keys); unsigned POST → 403 (verified)
- All queries student-scoped; foreign lecture id reads as 404
- No secret in any client component; PostHog public key only

## Checks run (real output)

- `npx tsc --noEmit` — clean
- `npm run lint` — clean (after removing two unused symbols)
- `npm run format:check` — all files pass
- `npm test` — 2/2 (schema tests)
- `npm run check:contrast` — 56/56 pairs
- `npm run build` — clean; routes: /, /upload, /lectures/[id], webhook, health

## Runtime verification (AC-11)

- Local dev + local prod server: anon 307 → Clerk host; fresh-JWT Bearer SSR
  renders home tiles + empty state; /api/health 200
- Prod: health 200; anon / → Clerk deployment-protection wall (documented
  behavior); unsigned webhook → 403
- Full pipeline live-fire (real Gemini): prepare planned 1 chunk (pages 1–3) →
  chunk done (stored Zod-validated output) → merge ready; **6 flashcards +
  2 quiz questions inserted, summary + key concepts stored**
- Prod lecture page renders the generated summary, key concepts, flashcard
  counter (/6), and quiz (Question 1 sur 2) — all with fresh-JWT probes

## Manual steps owed to the engineer

1. **QStash token is dead** — Upstash rejects the stored `QSTASH_TOKEN`
   ("invalid token"); replace it in `.env.local` **and Vercel env**, redeploy,
   then a real upload exercises the one unproven hop (QStash cloud → webhook).
2. Visual pass against `docs/design/UI designs/` mockups 2–6 (model limitation).
3. `vercel env pull` after rotating QStash credentials.

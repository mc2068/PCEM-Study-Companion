# 0004. Core study loop (Slice 1: the walking skeleton)

**Date**: 2026-09-08
**Status**: Proposed

## Summary

This spec designs the first real slice of the product: a student signs in, uploads a lecture PDF, the AI reads it and produces a summary in simple French, flashcards, and a quiz, and the student studies both. Everything runs through the stack already chosen in spec 0001 and the database shape already built in spec 0002, so this slice adds no new tables and no new vendors. It is a thin but complete path through every layer: browser, server actions, storage, queue, model, and back to the screen.

## Requirements

**User stories**:

- As a student, I want to upload a lecture PDF and get a structured summary, flashcards and a quiz from it, so I can understand and revise my own course material.
- As a student, I want to see honest progress and clear retry states while my lecture is being processed, so I am never left staring at silence.
- As a student, I want to grade flashcards after reading them, so the ones I struggle with come back sooner.

**Acceptance criteria** (the contract):

- **AC-1**: Signed out visitors are redirected to sign in. A signed in student lands on an "Aujourd'hui" home screen that shows their lectures with their processing state and an upload call to action, all in French.
- **AC-2**: The upload form accepts one PDF of at most 25 MB and at most 60 pages (a 12 chunk ceiling at 5 pages per chunk; over the ceiling is refused with a clear French message), assigns the lecture to a module that defaults to an auto created per student "Cours généraux" module but can be changed to any existing module, and creates the lecture row in `uploaded` state with `title` set from the trimmed file name (120 characters max).
- **AC-3**: The server validates the file type and size before creating anything, issues a pre signed upload URL scoped to `lectures/<clerkUserId>/<lectureId>.pdf` (10 minute expiry, PUT only, one object path), and the browser uploads directly to Supabase Storage. PDF bytes never pass through the Next.js server. A cap refused upload leaves no lecture row.
- **AC-4**: `finalizeUpload` atomically moves the lecture `uploaded` → `processing` (the gate for counting the daily usage event) and publishes the `prepare` job; the prepare worker verifies the stored object is a real PDF (`%PDF-` magic, pdf-lib parse) and plans one job per 5 page chunk through QStash to a signature verified webhook; each chunk worker calls Gemini `gemini-2.5-flash` through the AI SDK `generateObject` with Zod schemas mirroring the spec 0002 column shapes, and stores structured output on `lecture_chunks.output`.
- **AC-5**: When the last chunk reaches done (processed equals total), the merge job is published; merge claims the lecture with one conditional state update (a second merge finds nothing to do), assembles `lectures.summary` (summary text plus key concepts), inserts `flashcards` and `quiz_questions` rows with positions and exactly 4 options, and moves the lecture to `ready`. QStash re deliveries of the same chunk never create duplicate rows or double count `processed_chunks` (idempotent).
- **AC-6**: Any chunk failure marks the lecture `failed` with a French `error_message`, and the UI shows a clear retry action that re-enqueues processing while keeping already done chunk outputs as a cache. On read, a reaper marks failed: a chunk stuck in `processing` over 10 minutes, a `processing` lecture with zero processed chunks over 10 minutes, or a lecture left in `uploaded` over 30 minutes (browser died before finalize). The student always sees a state, never silence.
- **AC-7**: The lecture page (Résumé tab) renders the structured summary: a plain French explanation of the key concepts from `lectures.summary`, plus a loading state while processing with a progress readout (chunks done over total) that refreshes by polling about every 5 seconds until a terminal state.
- **AC-8**: The flashcard study view shows the lecture's cards one at a time with a flip interaction and the four grade buttons (À nouveau, Difficile, Correct, Facile). Grading writes one `review_logs` row per card per local day (unique constraint respected, duplicate treated as a no op) and updates the card's SM 2 state with the constants defined in this spec. New cards start due immediately (ease 2.5, interval 0, lapses 0, due at insert time, from the spec 0002 defaults).
- **AC-9**: The quiz view shows the lecture's questions one at a time (stored order, no shuffle in slice 1) with immediate feedback and an explanation. Quiz answers are transient in slice 1 (no attempt storage; the exam slice owns attempt history).
- **AC-10**: A student who already reached 10 successful upload starts in their local day is refused with a clear French message; the count comes from `usage_events` (append only) using day bounds computed from `students.timezone`, re checked inside `finalizeUpload` to close the parallel upload race.
- **AC-11**: The whole path works on the deployed Vercel URL, not only locally, with QStash reaching the production webhook.
- **AC-12**: The upload UI discloses honestly that on the free Gemini tier, submitted content may be used by Google.

## Decision

**Chosen option**: Option 2: the QStash chunked pipeline on the existing stack (see rationale.md).

Build the full tracer bullet: signed in shell, direct to storage upload, one QStash message per 5 page chunk, Gemini per chunk via `generateObject`, an idempotent claimed merge, and the three study surfaces (résumé, flashcards, quiz), reproducing the approved mockups in `docs/design/UI designs/` exactly.

**Implementation skills**: `next-dev-loop` (`vercel/next.js`, `.agents/skills/next-dev-loop/`) · `ai-sdk` (`vercel/ai`, `.agents/skills/ai-sdk/`) · `clerk-nextjs-patterns` (Clerk skill suite) · `clerk-testing` (Clerk skill suite, for signed in browser verification) · `qstash` conventions from spec 0001 (`Upstash/QStash`)

## Feature design

**Data model**: zero new tables. Spec 0002 is the target as-is; every column this feature needs exists. `students` rows are provisioned lazily: an idempotent `ensureStudent()` in server code runs on the first authenticated request of a session (upsert by Clerk user id) and also upserts the per student "Cours généraux" default module (unique on owner plus name), so no Clerk webhook dependency exists in this slice. New dependency: `pdf-lib` (page counting and PDF validation, server side).

**Constants** (owned by this spec, retuned only by spec update):

| Constant                | Value                                               | Used for                                                |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Chunk size              | 5 pages                                             | prepare worker chunk plan                               |
| Chunk ceiling           | 12 chunks (60 pages)                                | upload refusal with French message                      |
| Cards per chunk cap     | 20                                                  | position math (`chunkIndex × 20 + index`)               |
| Questions per chunk cap | 5                                                   | position math (same formula, separate sequence)         |
| Gemini model            | `gemini-2.5-flash`                                  | all `generateObject` calls, per call timeout under 60 s |
| Stuck thresholds        | 10 min chunk, 10 min zero progress, 30 min uploaded | reaper on read                                          |
| QStash retries          | 3 per message                                       | publish config; exhaustion handled by the reaper        |
| Progress poll           | 5 s                                                 | lecture page while `processing`                         |
| Daily upload cap        | 10                                                  | quota check                                             |

**French copy rule**: all student visible strings (validation errors, failure messages, the AC-12 disclosure, empty states) come from one shared constants map in `src/features/study/` (single source, easy to review), for example "Fichier trop volumineux (25 Mo max)", "Limite quotidienne d'uploads atteinte", "Format PDF requis", "Cours trop long (60 pages max)", "Le contenu envoyé peut être utilisé par Google (forfait gratuit Gemini)".

**Per chunk Zod schemas** (application code, mirroring spec 0002 columns): chunk output = `{ summaryFragment: string, flashcards: { front, back }[] (max 20), questions: { prompt, options: string[4], correctIndex: 0..3, explanation? }[] (max 5) }`; merge output = `{ summary: string, keyConcepts: string[] }`. An invalid model response marks the chunk failed and returns 200 (permanent error, no retry); only transient infrastructure errors return 5xx so QStash retries (3 attempts) before the reaper takes over.

**State transitions**:

- lecture: `uploaded` → `processing` → `ready` | `failed`; retry from `failed` returns to `processing` (done chunk outputs kept as cache)
- chunk: `pending` → `processing` → `done` | `failed`; retry returns to `processing`
- pipeline jobs: `prepare` (one per lecture) → N × `chunk` → `merge` (published by the last chunk to finish; claims the lecture via one conditional update, else no ops)

**API surface**:

| Surface                                               | Method | Key inputs                                                             | Key outputs                                            | Auth                                 | Key errors                                                                                |
| ----------------------------------------------------- | ------ | ---------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `createUpload` (server action)                        | POST   | fileName, fileSizeBytes, moduleId (optional)                           | lectureId, presigned PUT URL                           | Clerk session                        | 413 over 25 MB, 400 not a PDF or over 60 pages, 429 daily cap (checked before any insert) |
| `finalizeUpload` (server action)                      | POST   | lectureId                                                              | ok; atomically sets `processing` and publishes prepare | Clerk session + owner                | 409 wrong state, 429 cap re checked here                                                  |
| `retryLecture` (server action)                        | POST   | lectureId                                                              | ok                                                     | Clerk session + owner                | 409 not failed                                                                            |
| `gradeCard` (server action)                           | POST   | flashcardId, grade enum                                                | next due interval                                      | Clerk session + owner                | duplicate day grade: silent no op                                                         |
| `POST /api/pipeline/qstash`                           | POST   | message body (type: prepare \| chunk \| merge, lectureId, chunkIndex?) | 200                                                    | QStash signature (both signing keys) | 400 bad signature; 5xx only for transient errors                                          |
| `/` home, `/lectures/[id]` (Résumé, Flashcards, Quiz) | GET    | lectureId                                                              | server rendered pages                                  | Clerk session                        | 404 foreign or missing lecture                                                            |

**Value sourcing**:

| Action                      | Value produced / displayed      | Source                                                                                                                      |
| --------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Upload cap check            | generations used today          | count of `usage_events` (kind `lecture_upload`) within day bounds computed from `students.timezone`; re checked at finalize |
| Lecture display name        | title on home and lecture pages | `lectures.title`, set at `createUpload` from the trimmed file name                                                          |
| Module picker list          | existing modules in the form    | server component query: `modules` where owner = session user, ordered by name                                               |
| Default module              | "Cours généraux" module id      | per student upsert inside `ensureStudent()`                                                                                 |
| Publish target URL          | QStash webhook endpoint         | app URL env (`QSTASH_ENDPOINT` when set, else the Vercel deployment URL), asserted in the deploy task                       |
| Chunk plan                  | totalChunks, page ranges        | `pdf-lib` page count of the stored PDF (prepare worker)                                                                     |
| Progress readout            | chunks done over total          | `lectures.processed_chunks` / `lectures.total_chunks` (increment only on the conditional pending → done update)             |
| Merged summary              | summary text + key concepts     | one Gemini `generateObject` call composing stored chunk fragments                                                           |
| Card and question positions | study order                     | `chunkIndex × 20 + index within chunk`                                                                                      |
| Home due count              | cards due today                 | `flashcards.due_at` within Tunisia day bounds (spec 0002 invariant)                                                         |
| Retry cache                 | already done chunks             | `lecture_chunks.status = done` rows never reprocessed                                                                       |
| Streak display              | study days                      | `review_logs.reviewed_day` distinct count (display only in slice 1)                                                         |

**Key invariants**:

- Every write is idempotent under QStash re delivery: chunk output upsert keyed on (lectureId, chunkIndex); `processed_chunks` increments only inside the conditional `pending → done` update; merge claims the lecture with one conditional state update so a second merge is a no op; the daily usage event insert is gated by the same `uploaded → processing` conditional that publishes prepare.
- The quota check runs before the lecture row is created and is re checked at finalize; the check then insert race can still overshoot marginally under parallel requests (accepted in spec 0002, narrowed here).
- The browser never holds a service key; the presigned URL is scoped to the owning student's folder and is the only storage credential the client sees.
- Every query filters by the Clerk user id of the session; a foreign lecture id reads as 404.
- All AI calls go through `generateObject` with Zod validation; an invalid model response marks the chunk failed, never stores malformed JSON.
- All UI copy is French first, sourced from the shared constants map; the AC-12 disclosure is visible on the upload form.

**Security model**: same as spec 0001's: all authorization in application code, queries scoped by Clerk user id, service key server only, QStash webhook signature verified with `QSTASH_CURRENT_SIGNING_KEY`/`QSTASH_NEXT_SIGNING_KEY`. The presigned PUT URL expires in 10 minutes and only allows one object path. No regulated data scope beyond the copyright care disclosed by AC-12.

**Configuration required**: one new variable, `QSTASH_ENDPOINT` (the absolute webhook URL QStash should call; defaults to the Vercel deployment URL when unset). Everything else exists in `.env.local` (Gemini, QStash token plus both signing keys, Supabase, Clerk). New dependency: `pdf-lib`.

**Critical test scenarios**:

- Happy path: sign in → upload a real 20 page French lecture PDF → chunks process → `ready` → résumé, 10+ flashcards, quiz all render and grade, verifies **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-9**
- Failure case: force a Gemini error on one chunk → lecture shows `failed` with French message and retry; retry keeps done chunks and completes; verifies **AC-6**
- Idempotency: replay the same QStash chunk message twice → no duplicate flashcards, questions, summary, or `processed_chunks` inflation; replay merge → no doubles; verifies **AC-5**
- Auth: signed out request redirects to sign in; student B requesting student A's lecture gets 404; verifies **AC-1** and the ownership invariant
- Quota: 11th upload attempt in one day is refused with the French cap message and leaves no lecture row; verifies **AC-10**
- Stuck: a chunk left in `processing` over 10 minutes shows as failed on the lecture page; an abandoned `uploaded` lecture fails after 30 minutes; verifies **AC-6**

## Build plan

Tracer Bullet order: each task lands a working segment of the full path, thickest risk first.

1. Signed in shell: Clerk gate on `/`, `ensureStudent()` (student plus default module provisioning), home page with lecture list and empty state (server components, French copy from the constants map), satisfies **AC-1**
2. Upload path: createUpload/finalizeUpload server actions (cap checked before insert and re checked at finalize), presigned PUT helper (fetch based, service key server only), upload form on the mockup's design with module picker and default, `usage_events` insert gated on the state transition, content use disclosure, satisfies **AC-2**, **AC-3**, **AC-10**, **AC-12**
3. Pipeline core: `POST /api/pipeline/qstash` with signature verification, publish helper (`QSTASH_ENDPOINT` target, retries 3), prepare worker (PDF magic and pdf-lib validation, page count, chunk rows, chunk messages), chunk worker (`gemini-2.5-flash` `generateObject` per chunk, conditional pending → done update carrying the output upsert), last-chunk merge publish, claimed merge (summary call, card and question inserts, `ready`), permanent vs transient error semantics, lazy stuck reaper on read (chunk, zero progress, abandoned uploaded), satisfies **AC-4**, **AC-5**, **AC-6**
4. Lecture page Résumé tab: processing progress with 5 s polling, summary render, key concepts, retry action on failure, satisfies **AC-6**, **AC-7**
5. Flashcards study view with SM 2 grading constants (first grading of a new card: again 10 min, hard 1 day, good 3 days, easy 7 days; then again → 10 min, ease −0.20, lapses +1; hard → interval × 1.2, ease −0.15; good → interval × ease; easy → interval × ease × 1.3; ease floor 1.3; interval cap 365 days; new cards start due immediately), satisfies **AC-8**
6. Quiz view with immediate feedback and explanations, stored order, satisfies **AC-9**
7. Deploy verification: `QSTASH_ENDPOINT`/Vercel URL parity plus the full env list asserted on Vercel (QStash token and both signing keys, Gemini key, Supabase service key, Clerk keys), QStash production webhook, full path exercised on the deployed URL, satisfies **AC-11**

PostHog engagement events (`lecture_uploaded`, `generation_completed`, `review_completed`) are captured inside tasks 2, 3 and 5 (client `posthog-js`, no new key).

## Consequences

**Positive**:

- The product becomes real end to end: after this slice a student can genuinely study their own lecture.
- Every later slice (review queue, chat, exams, dashboard) only thickens segments of this path.
- No schema change and no new vendor keep the operational surface exactly as chosen in spec 0001.

**Negative / tradeoffs**:

- Local development needs QStash to reach localhost (Console forward or tunnel); real daily friction.
- Free Gemini limits mean a burst of uploads queues; students see honest progress, not instant results.
- Quiz answers are not stored in this slice; the exam slice adds that history via attempts.
- The prepare job adds one extra message per lecture, and the 60 page ceiling is a real limit long anatomy decks will hit; raising it is a constant change plus a cost conversation.

**Neutral**:

- The SM 2 constants are initial values owned by this spec; the review slice (row 6) may retune them by updating this spec.
- Mockups govern the look; responsive behavior down to mobile is required by AGENTS.md §3 even though only desktop mockups exist.
- QStash failure webhooks are not used in slice 1; the reaper on read is the only stuck detection.

## Follow-up

- [ ] Decide the local dev pattern for QStash (Console forward vs tunnel) at build time, task 3
- [ ] The `qstash` skill is not installed; consider installing the Upstash community skill for webhook verification conventions before task 3
- [ ] Library slice (row 8) replaces the "Cours généraux" default module flow with real module management
- [ ] Exam slice owns attempt storage for quiz answers (AC-9 is transient by design)
- [ ] Raise the 60 page ceiling later only with a Gemini cost/quota check

## Rationale

Reasoning and options: see rationale.md.

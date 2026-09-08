# Rationale — 0004 Core study loop

## Context

The product's whole value is one journey: a student gets their own lecture PDF back as something they can study. Until that path works end to end, every other feature (review scheduling, chat, exams, dashboard) has nothing real to sit on. The scope calls this the walking skeleton, and the project's build approach (Tracer Bullet) says: build it thin but complete through every layer, then thicken.

The forces that shape the decision:

- **Serverless runtime.** Vercel functions have hard execution limits. Reading a 40 page PDF and generating a study set takes minutes; that work can never live in the request path (spec 0001 records this).
- **Free Gemini tier.** Daily request limits and rate limits mean generation must be spread out, retried safely, and bounded per student. A burst of uploads queues rather than fails.
- **Files stay out of the server.** Lecture PDFs go browser → storage directly through a presigned URL; the host's body limit and memory never touch them.
- **The student must never see silence.** Processing is long, so every state (queued, chunk progress, failed, retry) has to be visible and honest, in French.
- **No new vendors.** Spec 0001 chose the stack and spec 0002 built the schema; this slice should consume those decisions, not revisit them. All needed keys already exist in the environment.

## Options considered

### Option 1: Generate in the request (no queue)

The upload server action calls Gemini directly and returns the finished study set.

**Pros**:

- Simplest possible code; no QStash, no webhook, no state machine beyond success and error.

**Cons**:

- Serverless timeouts make it fail for any real lecture; minutes long requests also break the upload UX.
- One flaky model call fails the whole lecture with no retry granularity.
- Contradicts spec 0001's recorded architecture ("never runs in the request path").

### Option 2: QStash chunked pipeline (chosen)

One prepare job counts pages and plans chunks, one QStash message per page range runs Gemini per chunk with idempotent output upserts, and a merge job composes the final study set. A stuck job reaper runs on read.

**Pros**:

- Fits serverless perfectly (short webhook invocations), retries are natural (QStash redelivers; idempotent upserts make that safe).
- Chunking bounds the blast radius: one bad page range fails one chunk, not the lecture, and spreads Gemini rate limit pressure over time.
- Honest progress comes for free (`processed_chunks` / `total_chunks`).

**Cons**:

- One more moving part that can fail (mitigated: signature verification, failed state, retry action).
- Local development needs QStash to reach localhost (Console forward or a tunnel) — real daily friction.

### Option 3: Browser driven chunking (no queue vendor)

The browser steps the lecture through processing by calling a server action per chunk until done.

**Pros**:

- Zero queue vendor; works identically on localhost and production; no webhook to expose.

**Cons**:

- The student's tab must stay open and awake for minutes; mobile backgrounds kill it mid pipeline.
- Retry, resume, and stuck job logic end up reimplemented in the client, unreliably.
- Processing halts whenever connectivity drops; the "never silence" promise becomes "never close your laptop".

## Rationale

Option 2 is not a new decision; it is the execution of spec 0001's recorded pipeline architecture (chunked, QStash driven, idempotent, reaper on read) at feature granularity. The engineering substance of this spec is the idempotency contract (which makes QStash's at least once delivery harmless), the chunk plan (5 pages per chunk, positions derived from chunk index so merges are order independent), and the failure surface (failed state + French retry action + reaper on read). Option 1 fails on runtime limits, Option 3 fails on the reality of studying on phones; the runner up is genuinely Option 3, which would be acceptable for a demo but not for the daily habit product the scope describes. The UI source is settled by AGENTS.md §3 and the engineer's direction: reproduce the approved mockups in `docs/design/UI designs/` exactly, with `design.md` as the token and component layer. The references level is `none` per the standing "always all recommended" directive (the recommended pick at this depth is no citations section).

## Project sources behind this decision

- `docs/specs/0001-stack-and-architecture/index.md`: the chunked pipeline, direct upload, authz model, quota protection.
- `docs/specs/0002-data-model/index.md`: the complete schema this feature uses unchanged, including the value sourcing for due cards, quota days, and progress.
- `AGENTS.md`: boundaries (browser never calls LLM or DB), French first, the QStash and storage rules.
- `docs/design/UI designs/`: the slice 1 screens (1, 2, 3, 4, 5, 6) this feature reproduces.

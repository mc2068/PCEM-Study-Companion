# 0001. Adopt a free tier integrated web stack

**Date**: 2026-09-07
**Status**: Accepted

## Summary

The whole product runs as one Next.js application written in TypeScript (a language that checks data shapes before the code runs), stores everything in a Supabase Postgres database (a proven relational database) with lecture files in Supabase Storage, and uses Google Gemini Flash to read lecture PDFs and produce summaries, flashcards and quizzes. Clerk handles sign in, PostHog handles product analytics and error tracking, and Vercel hosts the app for free. Every part sits on a free tier because a zero fixed cost was a hard requirement from the engineer. For building, this means we scaffold once from this stack, and each later feature installs only the small extra pieces it needs.

## Decision

**Chosen option**: Option 1: the free tier integrated stack.

The product is a single Next.js 16 monolith (one codebase for interface and server logic) on Supabase Postgres, with Gemini Flash as the document reading model behind the Vercel AI SDK, a database backed job queue driven by QStash so no serverless function ever runs for minutes, deployed on Vercel from GitHub.

**Implementation skills**: `next-dev-loop` (`vercel/next.js`, `.agents/skills/next-dev-loop/`) · `ai-sdk` (`vercel/ai`, `.agents/skills/ai-sdk/`) · Clerk skill suite (provided by the agent environment, not stored in this repo)

### Cross cutting architecture decisions (added after the 2026-09-07 cross check)

- **Upload path**: direct to storage. A Clerk authed server action validates the student and issues a pre signed upload URL scoped to that student's own folder in Supabase Storage. The browser uploads the PDF directly, so the host's request body limit never touches lecture files.
- **Authorization model**: one enforcement point for database data. All database access happens in server code through Drizzle, every query scoped by the Clerk user id stored on the student row, and the service key never reaches client code. Storage access uses the Clerk to Supabase JWT integration so a signed URL can only land in the owning student's folder.
- **Processing pipeline**: chunked by design. One lecture becomes one job with one QStash message per page range chunk; every step is idempotent under retries, each chunk produces its own structured JSON, a merge step assembles the final study set, and any job stuck in processing past a timeout is marked failed on read, so the student always sees a retry state, never silence.
- **Quota protection**: a per student daily generation cap in app code protects the shared free Gemini quota, since billing does not exist yet to do it naturally.

## Proposed stack

| Layer                 | Choice                                                                          | Reason                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Language              | TypeScript (engineer accepted recommendation)                                   | The AI pipeline lives on structured JSON (flashcards, quizzes); types catch shape errors at build time               |
| Framework             | Next.js 16, App Router                                                          | One codebase for UI and API (monolith), verified current today, first class AI SDK support                           |
| Primary DB            | Supabase Postgres, free tier (engineer accepted recommendation)                 | Relational per expert default; 500 MB is years of our structured data; single vendor also supplies file storage      |
| ORM                   | Drizzle                                                                         | TypeScript first, near SQL for complex queries, fast cold starts on serverless                                       |
| Auth                  | Clerk (engineer's pick)                                                         | Proven auth service, never build from scratch; free tier covers our scale for years                                  |
| LLM                   | Gemini 3.8 Flash, Google AI Studio free tier (engineer accepted recommendation) | Only major provider with a real free API tier, and native PDF understanding, verified current today                  |
| PDF understanding     | Native model input                                                              | The model sees tables and figures directly, which matters for image heavy anatomy lectures; no extraction dependency |
| AI orchestration      | Vercel AI SDK v7                                                                | generateObject with Zod gives typed, validated study set JSON; provider swap is a one line change                    |
| Background jobs       | DB backed queue + QStash free tier (engineer accepted recommendation)           | Serverless functions cannot run for minutes; a short worker driven by QStash processes lectures with retries         |
| File storage          | Supabase Storage, 1 GB                                                          | Object storage per expert default; bundled with the database vendor                                                  |
| Hosting               | Vercel Hobby (engineer accepted recommendation)                                 | Zero config deploys from GitHub, preview URL per change                                                              |
| Analytics + errors    | PostHog (engineer's pick)                                                       | One free vendor covers product analytics, error tracking and session replay                                          |
| Email                 | None in v1 (engineer accepted recommendation)                                   | Clerk sends verification email itself; reminders are deferred in the scope                                           |
| Package manager, repo | pnpm; GitHub private repo (engineer accepted recommendation)                    | Fast installs; deploys flow from the repo; the repo carries the workflow state files                                 |
| Runtime               | Node 22                                                                         | Required by AI SDK v7; pinned at scaffold                                                                            |

## Consequences

**Positive**

- Zero fixed monthly cost across every vendor, matching the hard constraint.
- The AI layer is swappable: the model provider sits behind one SDK, so raising quality or escaping rate limits later is a configuration change, not a rewrite.
- One vendor (Supabase) covers two layers, and one vendor (PostHog) covers three concerns, which keeps the operational surface small for a solo founder.
- The load bearing versions and terms (Next.js 16, Supabase free tier terms, AI SDK v7, Gemini document input) were verified from official sources today; the numeric limits on Vercel, Gemini and QStash remain unverified and are tracked in Follow up.

**Negative (accepted tradeoffs)**

- Free tier ceilings everywhere: Supabase pauses projects after one week of inactivity, Gemini has daily request limits, Vercel Hobby limits are real but numerically unverified. Growth past these ceilings means the first paying change is infrastructure, not features.
- Rate limits on the free Gemini tier mean a burst of students uploading lectures at once will queue. The student sees a processing state, not instant results, and the copy must say so honestly.
- Four vendors to wire at scaffold time (Supabase, Clerk, PostHog, Upstash) means roughly ten environment secrets, and the Supabase service key must never reach client code.
- QStash is one more moving part that can fail; its webhook signature must be verified or the processing endpoint becomes an open door.
- Vercel Hobby is licensed for personal, non commercial use only. The roadmap already plans freemium billing, so the first real cost is a planned migration to a commercial plan or another host, not a surprise.
- The 1 GB of file storage is shared across every student, so it holds a community total of a few hundred lecture PDFs, not years of headroom. Upload size caps and a cleanup policy for removed lectures arrive with the library slice.
- On the free Gemini tier, submitted content may be used by Google to improve its products. Lecture PDFs are often the faculty's copyrighted material, so the product must disclose this honestly in the interface, and a later paid tier (where content is not used that way) becomes a privacy upgrade as much as a capacity one.
- Preview deployments share the single production Supabase project unless a second free project is created for previews.

**Neutral to learn**

- Next.js 16 App Router and server components have a learning curve if the engineer has mostly used older patterns.
- Node 22 is pinned by the AI SDK, so local setup must match.

## Follow-up

- [ ] Verify at build time: Vercel Hobby numeric limits including the cron job allowance (the keep alive job depends on it), Gemini free tier rate limits and context window, QStash free message quota, Clerk and PostHog free tier caps (sources truncated or recalled from memory during this decision).
- [ ] Decide and implement account deletion cleanup (what happens to a student's files and rows when they delete their account).
- [ ] Create a second free Supabase project for preview deployments, or accept that previews touch production data.
- [ ] Add a daily keep alive job (a Vercel Cron ping to a tiny endpoint) at scaffold time so the Supabase free project never pauses.
- [ ] At `/audit`, record the `next-dev-loop` and `ai-sdk` skills and the Clerk suite in root `AGENTS.md` (project wide).
- [ ] Connect the official Supabase MCP server once the database exists; deferred by engineer choice today.
- [ ] Slice 2 will owe a spaced repetition algorithm decision (proven library vs hand rolled); noted here so it is not lost.

## Rationale

Why this option and not the others, the alternatives considered, and the sources: see `rationale.md` beside this file.

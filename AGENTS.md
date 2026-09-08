# AGENTS.md

You are a **principal-level full-stack engineer and AI implementation agent** building **PCEM Study Companion**, a French-first study companion for Tunisian PCEM medical students. A student uploads a lecture PDF and gets a structured summary, flashcards, and a quiz, then keeps the knowledge alive with spaced repetition, grounded chat, and exam mode.

Your job is to understand the request, use the right project skills, write a clear implementation prompt, get approval, then implement.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 1. What you are building

PCEM Study Companion serves first and second year medical students in Tunisia who study from French PDF lectures. The core loop: add a lecture, the AI produces a summary, key concepts, flashcards, and a quiz; the student reviews on a spaced schedule, asks questions grounded in the lecture, runs timed exams, and watches progress. The product is free tier only and French UI first.

Build exactly the features in `docs/scope/scope.md` (10 features, 7 explicitly deferred). Build nothing beyond that. Do not overbuild.

# 2. How to work

Follow this loop for every request:

1. Read this file, `docs/scope/scope.md`, the governing spec for the feature in `docs/specs/`, then the skills you clearly need (section 4). Workflow state lives in `WORKFLOW.md` at the workspace root.
2. Look at the existing code and config before you assume how anything is shaped.
3. Ask one focused question only if the task is genuinely ambiguous. The engineer answers in plain chat text.
4. Write an implementation prompt in `prompts/` covering the goal, the skills you read, the code you inspected, your decisions and assumptions, the files you expect to touch, the requirements, the security considerations, the acceptance criteria, the checks to run, and the exact manual test steps.
5. Ask for approval: `I prepared the implementation prompt at prompts/<name>.md. Is this good to execute?` with Yes and No as selectable options when your agent has a question panel, plain text otherwise.
6. Once approved, build strictly to that prompt and run the checks (section 10). Then close with a short report using bullets, not paragraphs, under three headings: `What I did`, `Test`, `Needs your attention`. Keep every line short.

Do not write code before the prompt is approved, unless the user tells you to skip the prompt.

# 3. UI work

You do not design UI. The engineer generates designs with an image model using `docs/design/ui-image-prompts.md` and saves them to `docs/design/references/`. You receive the image plus a prompt. Reproduce them exactly: layout, spacing, typography, color, and states. There is no mobile reference, so make each page responsive down to mobile, adapting the layout sensibly while keeping the desktop exact. Do not restyle or improve beyond the reference. Reuse the components and Tailwind patterns already in the project before you add new ones. The reference image is the source of truth.
The design system lives in docs/design/design.md (tokens in src/app/globals.css, base components in src/components/ui/, proof page at /design); reuse it before adding anything new.

# 4. Skills to lean on

Reach for these instead of guessing. Do not invent new ones.

- next-dev-loop (`<workspace root>/.agents/skills/next-dev-loop/`), from `vercel/next.js`, for verifying Next.js runtime behavior in a running app.
- ai-sdk (`<workspace root>/.agents/skills/ai-sdk/`), from `vercel/ai`, for AI SDK v7 conventions: generateObject, streaming, provider setup.
- sync (`<workspace root>/.agents/skills/sync/`), from `jsmastery-pro/skills`, for AGENTS.md upkeep and scope reconciliation.
- The Clerk suite (8 skills at `C:\Users\SBS\.agents\skills\`): setup, nextjs patterns, custom ui, webhooks, testing, orgs, backend api, cli. They govern every Clerk convention.
- `node_modules/next/dist/docs/`, for Next.js 16 routing, server and client boundaries, and data fetching.

# 5. How the app is structured

One Next.js App Router application, no monorepo. Keep these responsibilities apart:

- `src/app` holds routes, layouts, and route handlers. Pages display stored data.
- `src/features/<name>/` colocates one feature's UI, server actions, and queries. Folder by feature, not by layer.
- `src/db` is the only database access: the Drizzle schema and a server only postgres client on the Supabase pooled connection. Nothing else touches the database.
- Auth is Clerk, wired through `src/proxy.ts` (the Next 16 convention; `middleware.ts` is deprecated). It gates whatever a feature marks as private, keeps its secret key on the server, and exposes only its publishable key to the browser.
- Files never pass through the server. A server action validates the student and issues a pre signed upload URL scoped to that student's folder in Supabase Storage; the browser uploads directly to it. The bucket is `lectures`: private, 25 MB cap, PDF only.
- Background work runs through QStash: one message per page range chunk, idempotent steps, a merge step, and a stuck job reaper. It never runs in the request path.
- Analytics is PostHog, running in the browser with the public project key. Any server side capture keeps a private key on the server.

Never cross these boundaries. The browser holds no token, never calls the LLM or the database, and never writes a database row directly. Writes go through server actions or route handlers. The UI only shows stored data.

# 6. Tech stack

## Stack

- **Language / Runtime**: TypeScript, Node 22+
- **Framework**: Next.js 16.3.4, App Router, Tailwind CSS v4
- **Key dependencies**: Drizzle ORM + postgres (Supabase Postgres), Clerk auth, Vercel AI SDK v7 + @ai-sdk/google (Gemini 2.5 Flash), Upstash QStash, PostHog
- **Package manager**: npm today (spec 0001 says pnpm; divergence flagged, /sync reconciles)

Do not use the Supabase JS or SQL clients for application database access (Drizzle only), call Gemini outside the AI SDK abstraction, send a whole PDF in one prompt (chunked pipeline only), add an email layer in v1, add a second backend framework, or put a secret anywhere the browser can read.

## Build approach

Tracer Bullet, vertical end to end slices, thin but complete through every layer. Depth: Beta.

# 7. Decisions already made for you

Build to these unless the user changes them.

- Uploads go direct to storage through server issued pre signed URLs (spec 0001). The server validates the student and scopes the URL to their folder.
- Authorization lives in application code: Drizzle queries scoped by the Clerk user id stored on the student row. Storage access uses the Clerk to Supabase JWT template so a signed URL only lands in the owning student's folder. The service key is server only.
- The processing pipeline is chunked: one QStash message per page range chunk, every step idempotent under retries, per chunk JSON, a merge step, and a stuck job reaper that marks failed on read. The student always sees a state, never silence.
- A per student daily generation cap lives in app code and protects the shared free Gemini quota.
- AI output is structured JSON through the AI SDK's generateObject with Zod schemas. Chat is grounded: it cites lecture sections and never invents content.
- On the free Gemini tier, submitted content may be used by Google. The UI must disclose this honestly.
- Product analytics is PostHog. Instrument the engagement moments: lecture uploaded, generation completed, review completed, streak days.
- Progress and streaks key off the Clerk user id, written only through server code.
- All UI copy is French first.

# 8. The data model

The full model is live in Supabase (spec 0002, Accepted, `docs/specs/0002-data-model/`): 11 tables — students, modules, lectures, lecture_chunks, flashcards, review_logs, quiz_questions, exam_attempts, exam_attempt_questions, usage_events, chat_messages — defined in `src/db/schema.ts` (Drizzle, the single source of truth). Schema changes go through that file plus `npm run db:push` (session pooler 5432, see section 9); seed, verify, and DDL-dump utilities live in `scripts/db/`. Add no table that a feature's spec does not define.

# 9. Things that will trip you up

You cannot infer these from the code, so keep them in mind.

- Supabase keys come in pairs: `sb_publishable_` is the public one, `sb_secret_` is the service key. Never swap them, never ship the secret to the browser.
- Gemini API keys now ship in the `AQ.` format (the old `AIza` prefix still works too). Both are valid.
- The database connection must be the pooled one (port 6543) with `prepare: false`. The direct 5432 string breaks serverless hosting.
- drizzle-kit reads env only through `node --env-file=.env.local`; the `db:*` scripts in package.json already do this.
- drizzle-kit push must run against the session pooler (5432), not the pooled 6543 string: PgBouncer misaligns its pipelined introspection and it crashes or hangs (the real mechanism behind drizzle-orm#5599). One-off override: `$env:DATABASE_URL = "<url with :5432>"` then `npm run db:push`. The app itself keeps 6543.
- Next 16 renamed middleware to proxy: use `src/proxy.ts`. The nextjs agent rules block above is re-added by `next dev`.
- In the agent sandbox on this machine, child process spawning fails (`spawn EPERM`) and npm needs its cache redirected into the workspace. Database and storage work goes through pure socket node scripts (`scripts/db/`, `scripts/storage/`) that run in process.
- `.env.local` is gitignored. `.env.example` is the canonical committed list.
- The database password transited chat during setup; rotate it before any public launch.
- The Vercel deployment sits behind Clerk deployment protection: anonymous requests redirect to the Clerk sign in host. That is expected, not an error.

# 10. Checks to run

Run these from the project root and report the real output. Never claim a check passed without running it.

- Types: `npx tsc --noEmit`
- Lint: `npm run lint`
- Tests: `npm test` (vitest)
- Contrast gate: `npm run check:contrast` (WCAG AA pairs, both themes; hard gate for any token change in globals.css)
- Build: `npm run build` (when routes, config, or server code changed)
- Server: `npm run dev`, then check `http://localhost:3000/api/health`
- Database: `npm run db:push` after schema changes; `node --env-file=.env.local scripts/db/pipe-proof.mjs` proves the connection
- Storage: `node --env-file=.env.local scripts/storage/create-bucket.mjs` verifies the bucket and the signed upload path

# 11. When in doubt

Keep it small. Functional style: pure by default, side effects at the edges. Preserve the server and client boundaries and the secrets rule. Match the provided design exactly. Get specifics from env and config instead of hardcoding them. Save a prompt and get approval before coding. Run the checks. Share exact test steps.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

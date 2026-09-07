# 0001 rationale (the decision record)

## Context

The decision: which foundational stack a greenfield web app builds on. The product is an AI study companion for Tunisian PCEM students (the two pre clinical years of medical school, taught in French). Its core pipeline turns student uploaded lecture PDFs into explained summaries, flashcards, quizzes and a spaced repetition review schedule.

Forces at play:

- **Hard constraint: zero fixed cost.** The engineer requires every vendor to sit on a free tier. This single force reshapes the AI layer more than any technical argument, because the product's heart is LLM processing (a large AI model reading documents and producing structured study material) and most major providers charge per use with no free API tier.
- **Solo founder plus AI agent.** The team is one non expert engineer working with an agent. Every additional vendor is setup, secrets and failure modes they must understand. Operational simplicity outranks elegance (the Tuesday at 5pm rule: the best architecture is one the team can build, understand and operate when help is away).
- **AI heavy pipeline with a serverless host.** Processing one lecture PDF with a large model takes minutes. Free serverless hosting kills functions that run too long, so the design must break processing into short worker steps from day one. This is a known platform constraint, decided before any measurement, so it is failure mode design and not premature scaling.
- **Scale reality.** Tunisian PCEM cohorts are thousands of students per year, not millions. Monolith, one region, no orchestration. The architecture pattern table for a small team says monolith, and nothing here argues otherwise.
- **Light compliance.** No patient data anywhere. Only student accounts (email, study content). Standard care with secrets and authorization is enough; nothing medical regulatory applies.
- **Consequence of not deciding:** the Stack & architecture feature is the foundation row of the scope. Every later slice (core study loop, spaced repetition, chat, exam mode) builds on it. An undecided stack blocks the entire build pass.

The landscape was verified today against official sources (versions, free tier terms) because training knowledge of this space goes stale in months; findings and their gaps are recorded under References.

## Options considered

### Option 1: The free tier integrated stack (ADOPTED)

Next.js 16 (TypeScript) as one monolith on Vercel Hobby; Supabase free tier for Postgres and file storage with Drizzle as the query layer; Gemini 3.8 Flash free tier behind Vercel AI SDK v7 with native PDF input; a database backed job queue driven by QStash so processing survives serverless timeouts; Clerk for sign in; PostHog for analytics and error tracking; pnpm and a private GitHub repo.

**Pros**:

- Zero fixed cost across every vendor, satisfying the hard constraint with room to grow.
- Every load bearing piece (Next.js 16, Supabase terms, AI SDK v7, Gemini document input) verified current today from official pages.
- Supabase covers database and file storage in one project, and PostHog covers analytics, errors and session replay in one vendor: fewest moving parts for a solo operator.
- The AI provider sits behind one SDK abstraction, so the riskiest free tier dependency (Gemini rate limits) is a swap, not a rewrite.

**Cons**:

- Free tier ceilings on every layer; the first real cost is infrastructure, not features.
- Four vendors to wire at scaffold time, roughly ten secrets to manage.
- QStash adds a queue component that needs signature verification and failure handling of its own.

### Option 2: Same shape, OpenAI instead of Gemini

Identical stack with OpenAI as the document model (its structured output quality is excellent and its document understanding is strong).

**Pros**:

- Arguably the strongest structured generation quality; one less exotic provider relationship.

**Cons**:

- No free API tier at all (trial credits only), which violates the hard constraint outright. Rejected on the constraint, not on quality.

### Option 3: Nuxt 4 + Neon + Groq

Vue based monolith on Neon serverless Postgres (no pause, cold starts instead) with Groq free inference.

**Pros**:

- Neon's database never needs a keep alive trick; Groq is free and extremely fast for text generation.

**Cons**:

- Groq runs text models without native PDF understanding, so an extraction pipeline returns and anatomy figures are lost; Neon has no storage, so file storage needs another vendor; the AI SDK's examples and community weight skew React. Rejected as strictly more moving parts for a weaker AI story.

### Option 4: SvelteKit + Cloudflare Pages + Gemini

Lean SvelteKit monolith on Cloudflare's generous free hosting.

**Pros**:

- Very generous free hosting limits and a lean runtime.

**Cons**:

- Running a Node dependent Next.js style stack on Cloudflare Workers means adapter quirks exactly where our AI and PDF libraries live; smaller ecosystem gravity for an agent assisted solo build. Rejected on operational risk.

## Rationale

The free constraint did the real steering. Among the major providers with document understanding that we verified, only Google offers a genuine free API tier (Mistral's free tier is community reported and was not verified), so the AI layer is Gemini with two insurance policies: the provider sits behind the AI SDK abstraction (swap later is one line), and processing runs through a queue so rate limits degrade to "your study set is being prepared" instead of errors. Everything else followed from keeping the operational surface small for one person: Supabase because one free project covers the two data layers, PostHog because one free vendor covers three observability concerns, Clerk because the engineer chose it and it is free at our scale. The only genuinely new technology in the stack is the AI layer itself; the rest (Next.js, Postgres, Drizzle, GitHub, pnpm) is deliberately boring, per the rule that boring technology is a feature. Where the engineer expressed a preference (Clerk, PostHog, free) the preference was recorded as the decision; where they accepted recommendations, each recommendation carried a reason and a runner up, and the runner ups are preserved above as the honest record of what we gave up.

The post decision cross check surfaced real gaps and they were closed in place rather than left for the build to trip on. The upload path and the authorization boundary are one decision because they are one problem: once lecture files travel directly from the browser to storage, the storage layer must know who owns which folder, and the Clerk to Supabase JWT integration is the smallest bridge that gives signed URLs that knowledge. Database authorization stays in application code because the application never exposes Supabase's own data API, so a single scoping rule in Drizzle queries covers every row the product owns. The processing pipeline was upgraded from a slogan to a design (chunks, idempotent steps, a merge step, a stuck job reaper) because the scope promises the student never sees silence, and a promise needs a mechanism. Finally, the reviewer was right that terms belong in the record as they are: Vercel Hobby is non commercial, the storage wall arrives before the database wall, and Google's free tier terms on submitted content are a privacy cost the product must disclose rather than bury.

## References

**Project sources**

- `docs/scope/scope.md` row 1 (Stack & architecture, needs a decision) and the scope header (Tracer Bullet, Beta)
- `docs/research/feature-research.md` (the product evidence base behind the features this stack must serve)
- `WORKFLOW.md` decisions log entries 6 to 11 (engineer constraints and round picks)
- Clerk agent skill suite, provided by the agent environment (not a project file)

**Practices and standards**

- Monolith first for small teams; boring proven technology; relational database as the default store; object storage, never files in the database; database backed queue before any broker; a proven auth service, never build from scratch; observability from day one; install dependencies just in time; provider abstraction against lock in; design for failure, not the happy path.

**Links (fetched and verified 2026-09-07)**

- Next.js current version: https://registry.npmjs.org/next/latest
- Supabase pricing and free tier terms: https://supabase.com/pricing
- Vercel AI SDK current version: https://registry.npmjs.org/ai/latest
- Gemini API pricing and document input: https://ai.google.dev/gemini-api/docs/pricing (page fetched; numeric figures rendered below the readable content, so flagged for verification)
- Vercel platform limits: https://vercel.com/docs/limits (page fetched; numeric figures unverified, flagged)
- Skill listings: https://www.skills.sh/vercel/next.js and https://www.skills.sh/vercel/ai

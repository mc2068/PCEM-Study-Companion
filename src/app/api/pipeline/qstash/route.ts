import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { jobSchema } from "@/features/study/schemas";
import { runPrepare, runChunk, runMerge } from "@/features/study/pipeline";

// Pipeline webhook (spec 0004): QStash calls this with signature
// verification on both signing keys. Permanent (validation) errors return
// 200 after recording failed state; transient errors throw → 5xx → QStash
// retries (3), then the reaper on read is the backstop.

async function handler(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = jobSchema.safeParse(raw);
  if (!parsed.success) {
    // Malformed payload: not retryable, and not tied to a lecture we know.
    return NextResponse.json({ ok: false, error: "bad payload" }, { status: 200 });
  }
  const job = parsed.data;

  switch (job.type) {
    case "prepare":
      await runPrepare(job.lectureId);
      break;
    case "chunk":
      await runChunk(job.lectureId, job.chunkIndex ?? 0);
      break;
    case "merge":
      await runMerge(job.lectureId);
      break;
  }
  return NextResponse.json({ ok: true });
}

export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

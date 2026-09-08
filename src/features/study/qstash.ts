// QStash publish helper (spec 0004): REST publishes to the pipeline webhook,
// 3 retries per message; the reaper on read is the exhaustion backstop.

const TOKEN = process.env.QSTASH_TOKEN;

function endpointUrl(): string {
  const explicit = process.env.QSTASH_ENDPOINT;
  if (explicit) return `${explicit.replace(/\/$/, "")}/api/pipeline/qstash`;
  const vercel = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!vercel) throw new Error("QSTASH_ENDPOINT or VERCEL_URL must be set to publish");
  return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}/api/pipeline/qstash`;
}

export async function publishJob(job: {
  type: "prepare" | "chunk" | "merge";
  lectureId: string;
  chunkIndex?: number;
}): Promise<void> {
  // The destination URL goes in the path raw (QStash rejects an
  // encodeURIComponent form with "invalid destination url" — proven 2026-09-08).
  const res = await fetch("https://qstash.upstash.io/v2/publish/" + endpointUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Retries": "3",
    },
    body: JSON.stringify(job),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`qstash publish failed: ${res.status} ${detail.slice(0, 200)}`);
  }
}

// Supabase Storage access, fetch based (spec 0001: direct upload; spec 0004
// security model: the service key stays server side, the browser only ever
// sees one presigned PUT URL scoped to its own folder).

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const LECTURES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "lectures";

function headers() {
  return { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY! };
}

// Issue a presigned PUT URL for one object path. Expiry is constant (spec 0004).
export async function createSignedUploadUrl(objectPath: string): Promise<string> {
  const res = await fetch(
    `${BASE}/storage/v1/object/upload/sign/${LECTURES_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`storage sign failed: ${res.status}`);
  const body = (await res.json()) as { url: string };
  // Supabase returns a relative path carrying the upload token.
  return `${BASE}/storage/v1${body.url}`;
}

// Server-side read of a stored lecture (never exposed to the browser).
export async function fetchLectureBytes(objectPath: string): Promise<Uint8Array> {
  const res = await fetch(
    `${BASE}/storage/v1/object/authenticated/${LECTURES_BUCKET}/${objectPath}`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`storage read failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

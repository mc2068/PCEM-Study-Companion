// Storage bootstrap: create the private `lectures` bucket (spec 0001),
// then prove the Slice-1 upload path by minting a signed upload URL.
// Pure node fetch — no child processes.
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  "Content-Type": "application/json",
};

// 1. Create the private bucket, 25 MB cap, PDFs only (spec: upload caps).
const createRes = await fetch(`${base}/storage/v1/bucket`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "lectures",
    public: false,
    file_size_limit: 26214400,
    allowed_mime_types: ["application/pdf"],
  }),
});

const createBody = await createRes.text();
console.log("create bucket:", createRes.status, createBody.slice(0, 120));

// 2. List buckets to verify it exists.
const listRes = await fetch(`${base}/storage/v1/bucket`, { headers });
const buckets = await listRes.json();
console.log(
  "buckets now:",
  (buckets ?? []).map((b) => `${b.name}(${b.public ? "public" : "private"})`).join(", "),
);

// 3. Slice-1 path proof: sign an upload URL into the bucket.
const signRes = await fetch(`${base}/storage/v1/object/upload/sign/lectures/pipe-proof.txt`, {
  method: "POST",
  headers,
  body: JSON.stringify({ expiresIn: 60 }),
});
const signBody = await signRes.json().catch(() => ({}));
console.log("signed upload url:", signRes.status, signBody?.url ? "ISSUED ✓" : JSON.stringify(signBody).slice(0, 120));

// Signs a QStash-format delivery (HS256 JWT per receiver.ts) and posts it to
// the deployed webhook — simulating exactly what QStash sends.
import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const url = process.argv[2] ?? "https://pcem-study-companion.vercel.app/api/pipeline/qstash";
// Pass bodies with quotes via QSTASH_PROBE_BODY — shell argv quoting mangles JSON.
const body =
  process.env.QSTASH_PROBE_BODY ??
  process.argv[3] ??
  '{"type":"prepare","lectureId":"11111111-1111-4111-8111-111111111111"}';

const key = new TextEncoder().encode(env.QSTASH_CURRENT_SIGNING_KEY);
const bodyHash = createHash("sha256").update(body).digest("base64url");
const now = Math.floor(Date.now() / 1000);

const jwt = await new SignJWT({ body: bodyHash })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuer("Upstash")
  .setSubject(url)
  .setIssuedAt(now)
  .setNotBefore(now)
  .setExpirationTime(now + 300)
  .sign(key);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Upstash-Signature": jwt },
  body,
});
console.log("STATUS", res.status);
console.log("RESPONSE", (await res.text()).slice(0, 300));

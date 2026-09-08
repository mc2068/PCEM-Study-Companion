// Extract the design system sheet's palette: decode the PNG, cluster flat
// color regions, classify by hue into the style block's named families.
// Pure node (zlib + typed arrays), no dependencies, runs in process.
import zlib from "node:zlib";
import { readFileSync } from "node:fs";

const path = process.argv[2];
const bytes = readFileSync(path);

// ── minimal PNG decode (8-bit, non-interlaced, RGB/RGBA/palette/gray) ──
if (bytes.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
let pos = 8,
  width = 0,
  height = 0,
  bitDepth = 0,
  colorType = 0,
  interlace = 0;
const idat = [],
  palette = [],
  trns = [];
while (pos < bytes.length) {
  const len = bytes.readUInt32BE(pos);
  const type = bytes.toString("ascii", pos + 4, pos + 8);
  const data = bytes.subarray(pos + 8, pos + 8 + len);
  if (type === "IHDR") {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
    interlace = data[12];
  } else if (type === "PLTE") {
    for (let i = 0; i < len; i += 3) palette.push([data[i], data[i + 1], data[i + 2]]);
  } else if (type === "tRNS") {
    for (const b of data) trns.push(b);
  } else if (type === "IDAT") idat.push(data);
  else if (type === "IEND") break;
  pos += 12 + len;
}
if (bitDepth !== 8) throw new Error(`bit depth ${bitDepth} unsupported`);
if (interlace) throw new Error("interlaced PNG unsupported");
const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = width * channels;
const px = Buffer.alloc(height * stride);
const abs = (v) => (v < 0 ? -v : v);
for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
  const cur = px.subarray(y * stride, (y + 1) * stride);
  for (let x = 0; x < stride; x++) {
    const a = x >= channels ? cur[x - channels] : 0;
    const b = prev ? prev[x] : 0;
    const c = x >= channels && prev ? prev[x - channels] : 0;
    let v = row[x];
    if (filter === 1) v = (v + a) & 255;
    else if (filter === 2) v = (v + b) & 255;
    else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
    else if (filter === 4) {
      const p = a + b - c,
        pa = abs(p - a),
        pb = abs(p - b),
        pc = abs(p - c);
      v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
    cur[x] = v;
  }
}
const getRGB = (i) => {
  const o = i * channels;
  if (colorType === 2) return [px[o], px[o + 1], px[o + 2]];
  if (colorType === 6) return [px[o], px[o + 1], px[o + 2]];
  if (colorType === 3) return palette[px[o]] ?? [0, 0, 0];
  if (colorType === 0) {
    const g = px[o];
    return [g, g, g];
  }
  if (colorType === 4) {
    const g = px[o];
    return [g, g, g];
  }
  throw new Error(`color type ${colorType} unsupported`);
};

// ── cluster pixels into 5-bit-per-channel buckets ──
const buckets = new Map();
const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 400000)));
let sampled = 0;
for (let i = 0; i < width * height; i += sampleStep) {
  const [r, g, b] = getRGB(i);
  const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const e = buckets.get(key) ?? [0, 0, 0, 0];
  e[0]++;
  e[1] += r;
  e[2] += g;
  e[3] += b;
  buckets.set(key, e);
  sampled++;
}
const clusters = [...buckets.entries()]
  .map(([, e]) => ({
    r: Math.round(e[1] / e[0]),
    g: Math.round(e[2] / e[0]),
    b: Math.round(e[3] / e[0]),
    n: e[0],
  }))
  .filter((c) => c.n / sampled > 0.0008)
  .sort((x, y) => y.n - x.n)
  .slice(0, 40);

// ── classify by hue / lightness ──
const toHex = (c) => "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");
const hsl = ({ r, g, b }) => {
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B),
    l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = Math.round((h * 60 + 360) % 360);
  }
  return { h, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};
const role = (c) => {
  const { h, s, l } = hsl(c);
  if (l > 0.93 && s < 0.12) return "white";
  if (l > 0.8 && s < 0.2) return "off-white/background";
  if (l < 0.22) return "near-black/slate";
  if (s < 0.12) return "neutral gray";
  if (h >= 225 && h <= 275) return "INDIGO family";
  if (h >= 30 && h <= 60) return "AMBER family";
  if (h >= 90 && h <= 170) return "GREEN family";
  if (h >= 340 || h <= 18) return "RED family";
  if (h > 275 && h < 340) return "purple/pink";
  if (h > 18 && h < 30) return "orange";
  return "other";
};
console.log(
  `PNG ${width}x${height} colorType=${colorType}, sampled ${sampled} px, clusters: ${clusters.length}\n`,
);
let last = "";
for (const c of clusters) {
  const r = role(c);
  if (r !== last) console.log(`── ${r} ──`);
  last = r;
  const { s, l } = hsl(c);
  console.log(
    `  ${toHex(c)}  ${((100 * c.n) / sampled).toFixed(2)}%  (h=${hsl(c).h} s=${s.toFixed(2)} l=${l.toFixed(2)})`,
  );
}

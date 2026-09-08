#!/usr/bin/env node
// Spec 0003 AC-2 hard gate: WCAG 2.1 AA contrast for the semantic token pairs.
// Zero dependencies. Parses the :root and .dark blocks of src/app/globals.css,
// evaluates the fixed pair matrix below, exits 1 on any failure.
// Disabled pairs are WCAG-exempt; borders are decorative (never the sole
// indicator) and intentionally not gated; raw accent/success on light are
// fill/decorative only - informative uses go through the *-text variants.
import { readFileSync } from "node:fs";

const CSS_PATH = new URL("../../src/app/globals.css", import.meta.url);

function parseBlock(blockRe) {
  const m = readFileSync(CSS_PATH, "utf8").match(blockRe);
  if (!m) return null;
  const map = {};
  const varRe = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|var\(--[a-z0-9-]+\))/g;
  let v;
  while ((v = varRe.exec(m[1])) !== null) map[v[1]] = v[2];
  return map;
}

function resolve(map, name, seen = new Set()) {
  const raw = map[name];
  if (!raw) return null;
  const ref = raw.match(/^var\(--([a-z0-9-]+)\)$/);
  if (!ref) return raw;
  if (seen.has(name)) return null;
  seen.add(name);
  return resolve(map, ref[1], seen);
}

function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fgHex, bgHex) {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// [foreground, background, minimum, usage]
const MATRIX = [
  ["text", "background", 4.5, "body text"],
  ["text", "surface", 4.5, "text on cards"],
  ["text", "surface-muted", 4.5, "text on soft fills (secondary button)"],
  ["muted-text", "background", 4.5, "secondary text"],
  ["muted-text", "surface", 4.5, "secondary text on cards"],
  ["muted-text", "surface-muted", 4.5, "secondary text on soft fills"],
  ["on-primary", "primary", 4.5, "primary button label"],
  ["on-primary", "primary-hover", 4.5, "primary button hover label"],
  ["on-accent", "accent", 4.5, "amber fill label"],
  ["on-accent", "accent-hover", 4.5, "amber fill hover label"],
  ["on-success", "success", 4.5, "sage fill label"],
  ["on-error", "error-strong", 4.5, "red button fill label"],
  ["primary-text", "background", 4.5, "indigo text/links"],
  ["primary-text", "surface", 4.5, "indigo text on cards"],
  ["primary-text", "primary-tint", 4.5, "primary badge"],
  ["accent-text", "background", 4.5, "amber informative text/icon"],
  ["accent-text", "surface", 4.5, "amber informative text on cards"],
  ["accent-text", "accent-tint", 4.5, "warning badge"],
  ["success-text", "background", 4.5, "sage informative text/icon"],
  ["success-text", "surface", 4.5, "sage informative text on cards"],
  ["success-text", "success-tint", 4.5, "success badge"],
  ["error-text", "background", 4.5, "error text"],
  ["error-text", "surface", 4.5, "error text on cards"],
  ["error-text", "error-tint", 4.5, "danger badge"],
  ["primary", "background", 3.0, "indigo UI edge/icon"],
  ["primary", "surface", 3.0, "indigo UI edge on cards"],
  ["error", "background", 3.0, "error UI edge/icon"],
  ["error", "surface", 3.0, "error UI edge on cards"],
];

let failures = 0;
let checks = 0;

for (const [theme, blockRe] of [
  ["light", /:root\s*\{([\s\S]*?)\n\}/],
  ["dark", /\n\.dark\s*\{([\s\S]*?)\n\}/],
]) {
  const map = parseBlock(blockRe);
  if (!map) {
    console.error(`FAIL: could not parse ${theme} block in globals.css`);
    process.exit(1);
  }
  console.log(`\n== ${theme} theme ==`);
  for (const [fg, bg, min, usage] of MATRIX) {
    checks++;
    const fgHex = resolve(map, fg);
    const bgHex = resolve(map, bg);
    if (!fgHex || !bgHex) {
      failures++;
      console.log(`MISS  ${fg} on ${bg} (${usage}): token missing or unresolvable`);
      continue;
    }
    const ratio = contrast(fgHex, bgHex);
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(
      `${ok ? "PASS" : "FAIL "} ${fg} on ${bg} (${usage}): ${ratio.toFixed(2)}:1 (min ${min}:1)`,
    );
  }
}

console.log(`\n${checks - failures}/${checks} pairs pass.`);
if (failures > 0) {
  console.error(`Contrast gate FAILED: ${failures} pair(s) below WCAG AA.`);
  process.exit(1);
}
console.log("Contrast gate passed.");

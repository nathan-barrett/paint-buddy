// Generates src/data/paints.json from the Arcturus5404/miniature-paints dataset
// (MIT-licensed). Re-run with `npm run build:paints` to re-sync.
//
// Source: https://github.com/Arcturus5404/miniature-paints
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAW = "https://raw.githubusercontent.com/Arcturus5404/miniature-paints/main/paints";

// Only the lines we surface in the app. { file } is the source .md, { line } the display name.
const BRANDS = [
  { file: "Citadel_Colour", line: "Citadel" },
  { file: "Vallejo", line: "Vallejo" },
  { file: "Army_Painter", line: "Army Painter" },
  { file: "AK", line: "AK" },
  { file: "Duncan", line: "Two Thin Coats" },
];

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");

const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());

async function parseBrand({ file, line }) {
  const res = await fetch(`${RAW}/${file}.md`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const text = await res.text();
  const out = [];
  let col = null; // header column name → index (varies: some files have a Code column)
  for (const raw of text.split("\n")) {
    const l = raw.trim();
    if (!l.startsWith("|")) continue;
    const c = cells(l);
    if (!col) {
      if (c[0] === "Name") {
        col = {};
        c.forEach((h, i) => (col[h] = i));
      }
      continue;
    }
    if (c[0]?.startsWith("---")) continue;
    const name = c[col.Name];
    const set = col.Set != null ? c[col.Set] : undefined;
    const [ri, gi, bi] = [c[col.R], c[col.G], c[col.B]].map(Number);
    if (!name || ![ri, gi, bi].every((n) => Number.isFinite(n))) continue;
    out.push({
      name,
      line,
      range: set && set !== "null" ? set : undefined,
      hex: `#${toHex(ri)}${toHex(gi)}${toHex(bi)}`,
    });
  }
  return out;
}

const all = [];
const usedIds = new Set();
for (const brand of BRANDS) {
  const paints = await parseBrand(brand);
  for (const p of paints) {
    let base = `${slug(p.line)}-${slug(p.range ?? "")}-${slug(p.name)}`.replace(/--+/g, "-");
    let id = base;
    let i = 2;
    while (usedIds.has(id)) id = `${base}-${i++}`;
    usedIds.add(id);
    all.push({ id, ...p });
  }
  console.log(`${brand.line}: ${paints.length}`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "src", "data", "paints.json");
writeFileSync(outPath, JSON.stringify(all, null, 0) + "\n");
console.log(`\nTotal ${all.length} paints → ${outPath}`);

# 🎨 Painting Buddy

A planning companion for painting miniatures. Build a **list of parts** for a mini
(Helmet, Shoulder Pads, Bolter, Base…) and give each part a paint recipe —
**Base / Shade / Layer / Highlight** slots plus optional extras. Everything persists
locally in your browser.

## Features
- **Parts list** — add the parts of your mini; each gets a slot-based recipe with a
  color-swatch preview for every paint.
- **~3,500 real paints** (Citadel, Vallejo, Army Painter, AK, Two Thin Coats) with hex values.
- **Paint inventory** — mark what you own; filter to owned paints.
- **Shopping list** — see exactly which paints a scheme needs that you don't own yet.
- **Cross-brand matching** — pick any color, or hit ≈ on a paint, to find the closest
  equivalents in other brands (perceptual CIE-Lab ΔE).
- **Projects** — multiple schemes, export/import as `.pbscheme.json`, and a **PNG recipe
  sheet** export.

## Tech
Vite + React + TypeScript, Dexie (IndexedDB) for local persistence. No backend — all
data lives in the browser on the device you use.

## Develop
```bash
npm install
npm run dev          # http://localhost:5173  (also exposed on your LAN)
npm run build        # production build → dist/
npm run build:paints # regenerate the paint dataset (src/data/paints.json)
```

## Data & privacy
Projects, recipes, and inventory are stored in your browser's IndexedDB — **per device,
not synced.** Deploying only makes the app reachable at a URL; it doesn't share your data.

## Paint data
Paint colors are generated from the MIT-licensed
[Arcturus5404/miniature-paints](https://github.com/Arcturus5404/miniature-paints) dataset.

# 🎨 Painting Buddy

A planning companion for painting miniatures. Load a **photo** of a mini, drop labeled
**pins** on its parts, and assign a paint — or a full multi-step recipe (basecoat → wash →
layer → drybrush → highlight) — to each. Everything persists locally in your browser.

## Features
- **Image annotation** — click a photo to drop numbered pins; name each part.
- **Multi-step recipes** per pin, across a real dataset of **~3,500 paints** (Citadel,
  Vallejo, Army Painter, AK, Two Thin Coats) with accurate hex values.
- **Paint inventory** — mark what you own; filter to owned paints.
- **Shopping list** — see exactly which paints a scheme needs that you don't own yet.
- **Cross-brand matching** — pick any color, or hit ≈ on a paint, to find the closest
  equivalents in other brands (perceptual CIE-Lab ΔE).
- **Projects** — multiple schemes, plus export/import as `.pbscheme.json`.

## Tech
Vite + React + TypeScript, Dexie (IndexedDB) for local persistence. No backend — all
data lives in the browser on the device you use.

## Develop
```bash
npm install
npm run dev          # http://localhost:5173  (also exposed on your LAN for phone testing)
npm run build        # production build → dist/
npm run build:paints # regenerate the paint dataset (src/data/paints.json)
```

## Your photos
Drop miniature photos into `src/assets/images/` and they appear in the in-app
"Saved image…" picker. Or use "Load image…" / drag-and-drop at runtime (those stay
in your browser only).

## Data & privacy
Projects, pins, recipes, inventory, and uploaded images are stored in your browser's
IndexedDB — **per device, not synced.** Deploying only makes the app reachable at a URL;
it doesn't share your data. Any image committed to `src/assets/images/` in a **public**
repo is served publicly.

## Paint data
Paint colors are generated from the MIT-licensed
[Arcturus5404/miniature-paints](https://github.com/Arcturus5404/miniature-paints) dataset.

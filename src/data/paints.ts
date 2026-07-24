import type { Paint } from "../types";
import rawPaints from "./paints.json";

/**
 * Paint dataset generated from the MIT-licensed community dataset
 * "Arcturus5404/miniature-paints" (https://github.com/Arcturus5404/miniature-paints),
 * scraped/maintained by the Miniature Painter Pro team. Hex = the dataset's RGB values.
 *
 * Regenerate with `npm run build:paints` (see scripts/build-paints.mjs) to re-sync
 * or change which brands/lines are included.
 */
export const PAINTS: Paint[] = rawPaints as Paint[];

export const PAINT_LINES = Array.from(new Set(PAINTS.map((p) => p.line))).sort();

const BY_ID = new Map(PAINTS.map((p) => [p.id, p]));

export const paintById = (id: string | undefined): Paint | undefined =>
  id ? BY_ID.get(id) : undefined;

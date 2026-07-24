import { PAINTS } from "./data/paints";
import type { Paint } from "./types";

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** sRGB (0-255) → CIE Lab, for perceptual color distance. */
function rgbToLab({ r, g, b }: RGB): [number, number, number] {
  let [rr, gg, bb] = [r, g, b].map((v) => {
    v /= 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  });
  // linear RGB → XYZ (D65)
  const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
  const y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
  const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const LAB_CACHE = new Map<string, [number, number, number]>();
function labOf(hex: string): [number, number, number] {
  let lab = LAB_CACHE.get(hex);
  if (!lab) {
    lab = rgbToLab(hexToRgb(hex));
    LAB_CACHE.set(hex, lab);
  }
  return lab;
}

/** CIE76 ΔE — perceptual distance between two hex colors (0 = identical). */
export function deltaE(hexA: string, hexB: string): number {
  const [l1, a1, b1] = labOf(hexA);
  const [l2, a2, b2] = labOf(hexB);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

export interface PaintMatch {
  paint: Paint;
  distance: number;
}

interface NearestOpts {
  limit?: number;
  excludePaintId?: string;
  /** Only return paints NOT in this line (for cross-brand suggestions). */
  excludeLine?: string;
  /** Only one match per other line, keeping the closest. */
  onePerLine?: boolean;
}

export function nearestPaints(hex: string, opts: NearestOpts = {}): PaintMatch[] {
  const { limit = 8, excludePaintId, excludeLine, onePerLine } = opts;
  let matches: PaintMatch[] = PAINTS.filter(
    (p) => p.id !== excludePaintId && (!excludeLine || p.line !== excludeLine)
  ).map((p) => ({ paint: p, distance: deltaE(hex, p.hex) }));

  matches.sort((a, b) => a.distance - b.distance);

  if (onePerLine) {
    const seen = new Set<string>();
    matches = matches.filter((m) => {
      if (seen.has(m.paint.line)) return false;
      seen.add(m.paint.line);
      return true;
    });
  }

  return matches.slice(0, limit);
}

/** Rough human label for a ΔE value. */
export function matchQuality(distance: number): string {
  if (distance < 2) return "near-exact";
  if (distance < 5) return "very close";
  if (distance < 10) return "close";
  if (distance < 20) return "similar";
  return "loose";
}

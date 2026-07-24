import type { PaintStep } from "./types";
import { paintById } from "./data/paints";

/**
 * The color used to preview a part in the 3D view. We show the most
 * "visible" coat: the last non-wash step (highlights/layers sit on top),
 * falling back to the last step, then nothing.
 */
export function displayColorForSteps(steps: PaintStep[] | undefined): string | undefined {
  if (!steps || steps.length === 0) return undefined;
  const topmost = [...steps].reverse().find((s) => s.type !== "Wash") ?? steps[steps.length - 1];
  return paintById(topmost.paintId)?.hex;
}

export function summarizeSteps(steps: PaintStep[] | undefined): string {
  if (!steps || steps.length === 0) return "unpainted";
  return steps
    .map((s) => {
      const paint = paintById(s.paintId);
      return `${s.type}: ${paint ? paint.name : "?"}`;
    })
    .join(" → ");
}

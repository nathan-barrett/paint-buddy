import type { Assignments, PaintStep, PaintStepType } from "./types";
import { SLOT_TYPES } from "./types";
import { paintById } from "./data/paints";

/** The slot step (non-extra) of a given role, if set. */
export function slotStep(steps: PaintStep[] | undefined, type: PaintStepType): PaintStep | undefined {
  return steps?.find((s) => !s.extra && s.type === type);
}

export function extraSteps(steps: PaintStep[] | undefined): PaintStep[] {
  return (steps ?? []).filter((s) => s.extra);
}

/** Steps in a sensible reading order: slots (Base→Shade→Layer→Highlight) then extras. */
export function orderedSteps(steps: PaintStep[] | undefined): PaintStep[] {
  const out: PaintStep[] = [];
  for (const t of SLOT_TYPES) {
    const s = slotStep(steps, t);
    if (s) out.push(s);
  }
  out.push(...extraSteps(steps));
  return out;
}

/**
 * The color used to preview a pin: the most "visible" coat —
 * Highlight → Layer → Base among slots, then the last extra, then Shade.
 */
export function displayColorForSteps(steps: PaintStep[] | undefined): string | undefined {
  for (const t of ["Highlight", "Layer", "Base"] as PaintStepType[]) {
    const s = slotStep(steps, t);
    if (s) return paintById(s.paintId)?.hex;
  }
  const ex = extraSteps(steps);
  if (ex.length) return paintById(ex[ex.length - 1].paintId)?.hex;
  const shade = slotStep(steps, "Shade");
  if (shade) return paintById(shade.paintId)?.hex;
  return undefined;
}

export function summarizeSteps(steps: PaintStep[] | undefined): string {
  const ordered = orderedSteps(steps);
  if (ordered.length === 0) return "unpainted";
  return ordered
    .map((s) => `${s.type}: ${paintById(s.paintId)?.name ?? "?"}`)
    .join(" → ");
}

// --- Migration from the earlier free-form model (Basecoat/Wash/…) ---
const LEGACY_MAP: Record<string, PaintStepType> = { Basecoat: "Base", Wash: "Shade" };

function normalizeSteps(steps: PaintStep[]): PaintStep[] {
  const seen = new Set<PaintStepType>();
  return steps.map((s) => {
    let type = (LEGACY_MAP[s.type] ?? s.type) as PaintStepType;
    let extra = s.extra;
    if (!extra && SLOT_TYPES.includes(type)) {
      if (seen.has(type)) extra = true; // a duplicate slot becomes an extra
      else seen.add(type);
    } else if (!SLOT_TYPES.includes(type)) {
      extra = true;
    }
    return extra ? { type, paintId: s.paintId, extra: true } : { type, paintId: s.paintId };
  });
}

/** Returns migrated assignments, or the same object if nothing changed. */
export function normalizeAssignments(assignments: Assignments): { assignments: Assignments; changed: boolean } {
  let changed = false;
  const out: Assignments = {};
  for (const [id, steps] of Object.entries(assignments)) {
    const next = normalizeSteps(steps);
    if (JSON.stringify(next) !== JSON.stringify(steps)) changed = true;
    out[id] = next;
  }
  return { assignments: changed ? out : assignments, changed };
}

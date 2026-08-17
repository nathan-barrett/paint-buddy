export interface Paint {
  id: string;
  name: string;
  line: string;
  hex: string;
  /** e.g. "Base", "Layer", "Contrast", "Model Color" */
  range?: string;
}

export type PaintStepType =
  | "Base"
  | "Shade"
  | "Layer"
  | "Highlight"
  | "Drybrush"
  | "Edge Highlight"
  | "Glaze"
  | "Wash"
  | "Other";

/** The fixed, one-paint-each roles shown as slots on every pin. */
export const SLOT_TYPES: PaintStepType[] = ["Base", "Shade", "Layer", "Highlight"];

/** Optional roles addable as free-form "extra" steps. */
export const EXTRA_TYPES: PaintStepType[] = ["Drybrush", "Edge Highlight", "Glaze", "Wash", "Other"];

export interface PaintStep {
  type: PaintStepType;
  paintId: string;
  /** True for free-form extra steps (beyond the four fixed slots). */
  extra?: boolean;
}

/** Maps a pin id to an ordered list of paint steps. */
export type Assignments = Record<string, PaintStep[]>;

/** A named part of the miniature; its recipe lives in Assignments[id]. */
export interface Part {
  id: string;
  label: string;
}

export interface Project {
  id: string;
  name: string;
  parts: Part[];
  assignments: Assignments;
  updatedAt: number;
}

/** A shareable/exportable scheme (a project without its internal id). */
export interface SchemeExport {
  app: "painting-buddy";
  version: 1;
  name: string;
  parts: Part[];
  assignments: Assignments;
}

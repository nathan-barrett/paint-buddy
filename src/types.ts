export interface Paint {
  id: string;
  name: string;
  line: string;
  hex: string;
  /** e.g. "Base", "Layer", "Contrast", "Model Color" */
  range?: string;
}

export type PaintStepType = "Basecoat" | "Wash" | "Layer" | "Drybrush" | "Highlight";

export const STEP_TYPES: PaintStepType[] = [
  "Basecoat",
  "Wash",
  "Layer",
  "Drybrush",
  "Highlight",
];

export interface PaintStep {
  type: PaintStepType;
  paintId: string;
}

/** Maps a pin id to an ordered list of paint steps. */
export type Assignments = Record<string, PaintStep[]>;

/** A labeled marker placed on a reference image; its recipe lives in Assignments[id]. */
export interface Pin {
  id: string;
  /** Normalized position on the image, 0–1. */
  x: number;
  y: number;
  label: string;
}

export interface Project {
  id: string;
  name: string;
  /** Filename of the loaded reference image. */
  imageName?: string;
  pins: Pin[];
  assignments: Assignments;
  updatedAt: number;
}

/** A shareable/exportable scheme (a project without its internal id). */
export interface SchemeExport {
  app: "painting-buddy";
  version: 1;
  name: string;
  imageName?: string;
  pins: Pin[];
  assignments: Assignments;
}

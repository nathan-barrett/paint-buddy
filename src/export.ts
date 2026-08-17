import type { Assignments, Part } from "./types";
import { paintById } from "./data/paints";
import { displayColorForSteps, orderedSteps } from "./recipe";

interface ExportArgs {
  name: string;
  parts: Part[];
  assignments: Assignments;
}

/** Render the parts + recipes as a tidy reference sheet and download it as a PNG. */
export async function exportProjectPng({ name, parts, assignments }: ExportArgs) {
  const PAD = 24;
  const W = 560;
  const TITLE_H = 44;
  const partRowH = 30;
  const stepRowH = 22;
  const partGap = 10;

  // Measure height.
  let bodyH = 0;
  for (const part of parts) {
    const steps = orderedSteps(assignments[part.id]);
    bodyH += partRowH + (steps.length ? steps.length * stepRowH : stepRowH) + partGap;
  }
  const H = TITLE_H + PAD + Math.max(bodyH, stepRowH) + PAD;

  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#15171c";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#e7e9ee";
  ctx.font = "600 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, PAD, PAD + 14);

  const swatch = (x: number, cy: number, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, cy - size / 2, size, size);
    ctx.strokeStyle = "#363c4a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, cy - size / 2, size, size);
  };

  let y = TITLE_H + PAD;
  ctx.textAlign = "left";

  if (parts.length === 0) {
    ctx.fillStyle = "#98a0b0";
    ctx.font = "14px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("No parts yet.", PAD, y + stepRowH / 2);
  }

  parts.forEach((part) => {
    const steps = orderedSteps(assignments[part.id]);
    const headCy = y + partRowH / 2;
    swatch(PAD, headCy, 18, displayColorForSteps(steps) ?? "#39414f");
    ctx.fillStyle = "#e7e9ee";
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(part.label, PAD + 28, headCy);
    y += partRowH;

    if (steps.length === 0) {
      ctx.fillStyle = "#98a0b0";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("unpainted", PAD + 28, y + stepRowH / 2);
      y += stepRowH;
    } else {
      steps.forEach((step) => {
        const paint = paintById(step.paintId);
        const cy = y + stepRowH / 2;
        swatch(PAD + 28, cy, 13, paint ? paint.hex : "#39414f");
        ctx.fillStyle = "#c7ccd6";
        ctx.font = "13px system-ui, sans-serif";
        const label = paint ? `${step.type}: ${paint.name} · ${paint.line}` : `${step.type}: ?`;
        ctx.fillText(label, PAD + 48, cy);
        y += stepRowH;
      });
    }
    y += partGap;
  });

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Failed to render PNG.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-recipe.png`;
  a.click();
  URL.revokeObjectURL(url);
}

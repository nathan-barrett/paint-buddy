import type { Assignments, Pin } from "./types";
import { paintById } from "./data/paints";
import { displayColorForSteps } from "./recipe";

interface ExportArgs {
  name: string;
  imageUrl: string;
  pins: Pin[];
  assignments: Assignments;
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image for export."));
    img.src = url;
  });

/** Render the reference photo + numbered pins + a recipe legend, and download it as a PNG. */
export async function exportProjectPng({ name, imageUrl, pins, assignments }: ExportArgs) {
  const img = await loadImage(imageUrl);

  const PAD = 24;
  const natW = img.naturalWidth || img.width || 600;
  const natH = img.naturalHeight || img.height || 800;
  const scale = Math.min(1, 1400 / natW);
  const imgW = Math.round(natW * scale);
  const imgH = Math.round(natH * scale);

  const TITLE_H = 40;
  const pinRowH = 26;
  const stepRowH = 20;
  const pinGap = 8;

  // Measure legend height.
  let legendH = 0;
  for (const pin of pins) {
    const steps = assignments[pin.id] ?? [];
    legendH += pinRowH + (steps.length ? steps.length * stepRowH : stepRowH) + pinGap;
  }

  const W = Math.max(imgW + PAD * 2, 600);
  const H = TITLE_H + imgH + (pins.length ? PAD + legendH : 0) + PAD * 2;

  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#15171c";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#e7e9ee";
  ctx.font = "600 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, PAD, PAD + 12);

  // Image
  const imgX = PAD;
  const imgY = TITLE_H;
  ctx.drawImage(img, imgX, imgY, imgW, imgH);

  // Pins over the image
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  pins.forEach((pin, i) => {
    const cx = imgX + pin.x * imgW;
    const cy = imgY + pin.y * imgH;
    const hex = displayColorForSteps(assignments[pin.id]) ?? "#cbd0d8";
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#12141a";
    ctx.stroke();
    ctx.fillStyle = "#12141a";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(String(i + 1), cx, cy + 1);
  });

  // Legend
  ctx.textAlign = "left";
  let y = imgY + imgH + PAD;
  const swatch = (x: number, cy: number, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, cy - size / 2, size, size);
    ctx.strokeStyle = "#363c4a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, cy - size / 2, size, size);
  };

  pins.forEach((pin, i) => {
    const steps = assignments[pin.id] ?? [];
    const headCy = y + pinRowH / 2;
    swatch(PAD, headCy, 16, displayColorForSteps(steps) ?? "#39414f");
    ctx.fillStyle = "#e7e9ee";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}. ${pin.label}`, PAD + 26, headCy);
    y += pinRowH;

    if (steps.length === 0) {
      ctx.fillStyle = "#98a0b0";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("unpainted", PAD + 26, y + stepRowH / 2);
      y += stepRowH;
    } else {
      steps.forEach((step) => {
        const paint = paintById(step.paintId);
        const cy = y + stepRowH / 2;
        swatch(PAD + 26, cy, 12, paint ? paint.hex : "#39414f");
        ctx.fillStyle = "#c7ccd6";
        ctx.font = "13px system-ui, sans-serif";
        const label = paint ? `${step.type}: ${paint.name} · ${paint.line}` : `${step.type}: ?`;
        ctx.fillText(label, PAD + 44, cy);
        y += stepRowH;
      });
    }
    y += pinGap;
  });

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Failed to render PNG.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-plan.png`;
  a.click();
  URL.revokeObjectURL(url);
}

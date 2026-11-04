import type { MarkerShape } from "./types";

export const SHAPES: { id: MarkerShape; label: string; anchor: "center" | "bottom" }[] = [
  { id: "pin", label: "Pin", anchor: "bottom" },
  { id: "dot", label: "Dot", anchor: "center" },
  { id: "ring", label: "Ring", anchor: "center" },
  { id: "diamond", label: "Diamond", anchor: "center" },
  { id: "square", label: "Square", anchor: "center" },
  { id: "star", label: "Star", anchor: "center" },
];
export const SHAPE_IDS = SHAPES.map((s) => s.id);
export function shapeAnchor(shape: MarkerShape) {
  return SHAPES.find((s) => s.id === shape)?.anchor ?? "center";
}

// SVG path for a shape in a 64x64 box. Pins hang from (32,60); other shapes center on (32,32).
export function shapePath(shape: MarkerShape): string {
  switch (shape) {
    case "pin":
      return "M32 60 C32 60 12 38 12 24 A20 20 0 0 1 52 24 C52 38 32 60 32 60 Z";
    case "dot":
      return "M32 12 A20 20 0 1 1 31.99 12 Z";
    case "ring":
      return "M32 12 A20 20 0 1 1 31.99 12 Z";
    case "diamond":
      return "M32 8 L56 32 L32 56 L8 32 Z";
    case "square":
      return "M12 12 H52 V52 H12 Z";
    case "star":
      return starPath(32, 32, 22, 10, 5);
  }
}
function starPath(cx: number, cy: number, R: number, r: number, n: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

// Raster icon for MapLibre, drawn at 2x. Id format: `${shape}|${color}`.
export function drawMarkerIcon(shape: MarkerShape, color: string): { width: number; height: number; data: Uint8ClampedArray } | null {
  if (typeof document === "undefined") return null;
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const path = new Path2D(shapePath(shape));
  ctx.lineJoin = "round";
  if (shape === "ring") {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.stroke(path);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.stroke(path);
    if (shape === "pin") {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(32, 24, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (shape === "dot") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(32, 32, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return { width: S, height: S, data: ctx.getImageData(0, 0, S, S).data };
}

// Direction arrow for the trail, pointing up (north); the layer rotates it.
export function drawArrowIcon(color: string): { width: number; height: number; data: Uint8ClampedArray } | null {
  if (typeof document === "undefined") return null;
  const S = 40;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.beginPath();
  ctx.moveTo(S / 2, 6);
  ctx.lineTo(S - 8, S - 8);
  ctx.lineTo(S / 2, S - 15);
  ctx.lineTo(8, S - 8);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();
  return { width: S, height: S, data: ctx.getImageData(0, 0, S, S).data };
}

// Vehicle that leads the story line: a plane for long hops, a car for short
// ones. Drawn pointing up; the layer rotates it to the bearing of travel.
export function drawVehicleIcon(kind: "plane" | "car", color: string): { width: number; height: number; data: Uint8ClampedArray } | null {
  if (typeof document === "undefined") return null;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.translate(S / 2, S / 2);
  ctx.scale(2.7, 2.7);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  const path = new Path2D();
  if (kind === "plane") {
    // Fuselage, swept wings, tail.
    path.moveTo(0, -20);
    path.lineTo(4, -12);
    path.lineTo(4, -4);
    path.lineTo(20, 6);
    path.lineTo(20, 10);
    path.lineTo(4, 5);
    path.lineTo(3, 13);
    path.lineTo(9, 17);
    path.lineTo(9, 20);
    path.lineTo(0, 17);
    path.lineTo(-9, 20);
    path.lineTo(-9, 17);
    path.lineTo(-3, 13);
    path.lineTo(-4, 5);
    path.lineTo(-20, 10);
    path.lineTo(-20, 6);
    path.lineTo(-4, -4);
    path.lineTo(-4, -12);
    path.closePath();
  } else {
    // Car from above: body with a cabin band.
    path.roundRect(-9, -17, 18, 34, 6);
  }
  ctx.fill(path);
  ctx.stroke(path);
  if (kind === "car") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-6.5, -9, 13, 9, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-6.5, 5, 13, 6, 2);
    ctx.fill();
  }
  return ctx.getImageData(0, 0, S, S);
}

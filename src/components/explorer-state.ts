import type { Dataset, GeoEvent } from "@/lib/types";
import { periodBounds, periodNext, periodStart, type Period } from "@/lib/period";

// The window a story opens on: one period around `t`, grown a period at a
// time on alternating sides until it holds at least `min` events (or every
// event, for small stories), so the first frame is wide enough to read.
export const OPENING_EVENTS = 20;
export function openingWindow(events: { t: number }[], t: number, p: Period, min = OPENING_EVENTS): [number, number] {
  let [from, to] = periodBounds(t, p);
  const need = Math.min(min, events.length);
  const count = () => events.reduce((n, e) => n + (e.t >= from && e.t < to ? 1 : 0), 0);
  const tMin = events.reduce((m, e) => Math.min(m, e.t), Infinity);
  const tMax = events.reduce((m, e) => Math.max(m, e.t), -Infinity);
  let side = 0;
  while (count() < need && (from > tMin || to <= tMax)) {
    if (side++ % 2 === 0 ? to <= tMax : from <= tMin) to = periodNext(to, p);
    else from = periodStart(from - 1, p);
  }
  return [from, to];
}


export type Filter = {
  timeRange: [number, number] | null;
  categories: string[] | null;
  placeContains: string | null;
  eventIds: string[] | null;
};

export const EMPTY_FILTER: Filter = { timeRange: null, categories: null, placeContains: null, eventIds: null };

export function applyFilter(ds: Dataset, f: Filter): GeoEvent[] {
  const pc = f.placeContains?.toLowerCase() ?? null;
  const cats = f.categories ? new Set(f.categories.map((c) => c.toLowerCase())) : null;
  return ds.events.filter(
    (e) =>
      (!f.timeRange || (e.t >= f.timeRange[0] && e.t <= f.timeRange[1])) &&
      (!cats || cats.has(e.category)) &&
      (!pc || e.place.toLowerCase().includes(pc)),
  );
}

export function rangeOf(ds: Dataset, f: Filter): [number, number] {
  if (f.timeRange) return f.timeRange;
  const a = ds.summary.tMin ?? 0;
  const b = ds.summary.tMax ?? a + 1;
  return a === b ? [a - 43200000, b + 43200000] : [a, b];
}

// Tightest box around the points. Longitude is treated cyclically: the box
// starts after the largest empty gap, so points on both sides of the Pacific
// produce a box that crosses the antimeridian (east may exceed 180) instead
// of one that wraps the whole world.
export function bboxOf(list: { lat: number; lng: number }[]): [number, number, number, number] | null {
  if (!list.length) return null;
  let b = 90,
    d = -90;
  for (const e of list) {
    if (e.lat < b) b = e.lat;
    if (e.lat > d) d = e.lat;
  }
  const lngs = [...new Set(list.map((e) => ((((e.lng + 180) % 360) + 360) % 360) - 180))].sort((x, y) => x - y);
  let a = lngs[0],
    c = lngs[lngs.length - 1];
  if (lngs.length > 1) {
    let gapStart = lngs.length - 1,
      gap = lngs[0] + 360 - lngs[lngs.length - 1];
    for (let i = 0; i < lngs.length - 1; i++) {
      const g = lngs[i + 1] - lngs[i];
      if (g > gap) {
        gap = g;
        gapStart = i;
      }
    }
    if (gapStart !== lngs.length - 1) {
      a = lngs[gapStart + 1];
      c = lngs[gapStart] + 360;
    }
  }
  if (c - a < 0.02) {
    a -= 0.05;
    c += 0.05;
  }
  if (d - b < 0.02) {
    b -= 0.05;
    d += 0.05;
  }
  return [a, b, c, d];
}

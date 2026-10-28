import type { Dataset, DatasetSummary, GeoEvent, Insight } from "../types";

export function summarize(events: GeoEvent[], dropped: DatasetSummary["dropped"]): DatasetSummary {
  const cats = new Map<string, number>();
  const places = new Map<string, number>();
  let tMin = Infinity,
    tMax = -Infinity;
  let minLng = 180,
    minLat = 90,
    maxLng = -180,
    maxLat = -90;
  for (const e of events) {
    cats.set(e.category, (cats.get(e.category) ?? 0) + 1);
    places.set(e.place, (places.get(e.place) ?? 0) + 1);
    if (e.t < tMin) tMin = e.t;
    if (e.t > tMax) tMax = e.t;
    if (e.lng < minLng) minLng = e.lng;
    if (e.lng > maxLng) maxLng = e.lng;
    if (e.lat < minLat) minLat = e.lat;
    if (e.lat > maxLat) maxLat = e.lat;
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));
  return {
    count: events.length,
    tMin: events.length ? tMin : null,
    tMax: events.length ? tMax : null,
    categories: top(cats, 50),
    topPlaces: top(places, 25),
    bbox: events.length ? [minLng, minLat, maxLng, maxLat] : null,
    dropped,
  };
}

// Deterministic, cheap pattern detection. These feed the model as evidence
// rather than asking it to eyeball thousands of rows.
export function detectInsights(ds: Pick<Dataset, "events" | "summary">): Insight[] {
  const ev = ds.events;
  const out: Insight[] = [];
  if (ev.length < 5 || ds.summary.tMin == null || ds.summary.tMax == null) return out;

  const span = ds.summary.tMax - ds.summary.tMin;
  const bucketMs = pickBucket(span);
  const nBuckets = Math.max(1, Math.ceil(span / bucketMs) + 1);

  // 1. Temporal bursts per category (z-score over bucket counts)
  const byCat = new Map<string, GeoEvent[]>();
  for (const e of ev) {
    if (!byCat.has(e.category)) byCat.set(e.category, []);
    byCat.get(e.category)!.push(e);
  }
  for (const [cat, list] of byCat) {
    if (list.length < 8) continue;
    const counts = new Array<number>(nBuckets).fill(0);
    const members: GeoEvent[][] = Array.from({ length: nBuckets }, () => []);
    for (const e of list) {
      const b = Math.min(nBuckets - 1, Math.floor((e.t - ds.summary.tMin!) / bucketMs));
      counts[b]++;
      members[b].push(e);
    }
    const { mean, sd } = stats(counts);
    if (sd === 0) continue;
    counts.forEach((c, b) => {
      const z = (c - mean) / sd;
      if (z >= 2.5 && c >= 3) {
        const t0 = ds.summary.tMin! + b * bucketMs;
        out.push({
          id: `burst-${cat}-${b}`,
          kind: "anomaly",
          title: `Burst of ${cat} events ${fmtRange(t0, t0 + bucketMs)}`,
          detail: `${c} ${cat} events in one ${bucketLabel(bucketMs)} vs an average of ${mean.toFixed(1)} (z=${z.toFixed(1)}).`,
          score: Math.min(1, z / 5),
          eventIds: members[b].map((e) => e.id),
          timeRange: [t0, t0 + bucketMs],
          bbox: bboxOf(members[b]),
        });
      }
    });
  }

  // 2. Spatial hotspots: grid cells with unusually many events
  const cell = pickCell(ds.summary.bbox);
  const grid = new Map<string, GeoEvent[]>();
  for (const e of ev) {
    const k = `${Math.floor(e.lat / cell)}:${Math.floor(e.lng / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(e);
  }
  const gcounts = [...grid.values()].map((v) => v.length);
  if (grid.size >= 6) {
    const { mean, sd } = stats(gcounts);
    for (const [, list] of grid) {
      const z = sd ? (list.length - mean) / sd : 0;
      if (z >= 2.5 && list.length >= 4) {
        const place = modePlace(list);
        out.push({
          id: `hot-${list[0].id}`,
          kind: "cluster",
          title: `Hotspot around ${place}`,
          detail: `${list.length} events concentrated near ${place} (z=${z.toFixed(1)} vs other areas). Categories: ${topCats(list)}.`,
          score: Math.min(1, z / 5),
          eventIds: list.map((e) => e.id),
          timeRange: [Math.min(...list.map((e) => e.t)), Math.max(...list.map((e) => e.t))],
          bbox: bboxOf(list),
        });
      }
    }
  }

  // 3. Value outliers
  const withVal = ev.filter((e) => e.value != null && Number.isFinite(e.value));
  if (withVal.length >= 10) {
    const { mean, sd } = stats(withVal.map((e) => e.value as number));
    if (sd > 0) {
      for (const e of withVal) {
        const z = ((e.value as number) - mean) / sd;
        if (z >= 3) {
          out.push({
            id: `out-${e.id}`,
            kind: "anomaly",
            title: `Outlier: ${e.title}`,
            detail: `${e.value} ${e.unit ?? ""} at ${e.place} on ${new Date(e.t).toISOString().slice(0, 10)} is ${z.toFixed(1)} standard deviations above the mean (${mean.toFixed(1)}).`,
            score: Math.min(1, z / 6),
            eventIds: [e.id],
            timeRange: [e.t, e.t],
            bbox: [e.lng, e.lat, e.lng, e.lat],
          });
        }
      }
    }
  }

  // 4. Lead/lag between category pairs: does category A's burst precede B's?
  const cats = [...byCat.keys()].filter((c) => byCat.get(c)!.length >= 8).slice(0, 8);
  for (let i = 0; i < cats.length; i++) {
    for (let j = 0; j < cats.length; j++) {
      if (i === j) continue;
      const a = series(byCat.get(cats[i])!, ds.summary.tMin, bucketMs, nBuckets);
      const b = series(byCat.get(cats[j])!, ds.summary.tMin, bucketMs, nBuckets);
      let best = { lag: 0, r: 0 };
      for (let lag = 1; lag <= Math.min(6, nBuckets - 3); lag++) {
        const r = corr(a.slice(0, nBuckets - lag), b.slice(lag));
        if (r > best.r) best = { lag, r };
      }
      if (best.r >= 0.7) {
        out.push({
          id: `lag-${cats[i]}-${cats[j]}`,
          kind: "correlation",
          title: `${cats[i]} tends to precede ${cats[j]}`,
          detail: `Counts of ${cats[j]} track counts of ${cats[i]} ${best.lag} ${bucketLabel(bucketMs)}${best.lag > 1 ? "s" : ""} earlier (r=${best.r.toFixed(2)}). Correlation, not proof of cause.`,
          score: best.r,
          eventIds: [],
          timeRange: null,
          bbox: null,
        });
      }
    }
  }

  // 5. Gaps: long silences in otherwise regular data
  const sorted = [...ev].sort((x, y) => x.t - y.t);
  const gaps = sorted.slice(1).map((e, i) => e.t - sorted[i].t);
  if (gaps.length > 20) {
    const { mean, sd } = stats(gaps);
    gaps.forEach((g, i) => {
      if (sd && (g - mean) / sd > 4 && g > bucketMs) {
        out.push({
          id: `gap-${i}`,
          kind: "gap",
          title: `Silence ${fmtRange(sorted[i].t, sorted[i + 1].t)}`,
          detail: `No events for ${(g / 86400000).toFixed(1)} days, far above the typical gap of ${(mean / 86400000).toFixed(2)} days.`,
          score: 0.5,
          eventIds: [sorted[i].id, sorted[i + 1].id],
          timeRange: [sorted[i].t, sorted[i + 1].t],
          bbox: null,
        });
      }
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 25);
}

function stats(xs: number[]) {
  const n = xs.length || 1;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { mean, sd };
}
function corr(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 4) return 0;
  const sa = stats(a.slice(0, n)),
    sb = stats(b.slice(0, n));
  if (!sa.sd || !sb.sd) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - sa.mean) * (b[i] - sb.mean);
  return s / (n * sa.sd * sb.sd);
}
function series(list: GeoEvent[], t0: number, bucketMs: number, n: number) {
  const s = new Array<number>(n).fill(0);
  for (const e of list) s[Math.min(n - 1, Math.floor((e.t - t0) / bucketMs))]++;
  return s;
}
const DAY = 86400000;
function pickBucket(span: number) {
  if (span <= 3 * DAY) return 3600000;
  if (span <= 90 * DAY) return DAY;
  if (span <= 3 * 365 * DAY) return 7 * DAY;
  return 30 * DAY;
}
export function bucketLabel(ms: number) {
  return ms === 3600000 ? "hour" : ms === DAY ? "day" : ms === 7 * DAY ? "week" : "month";
}
function pickCell(bbox: DatasetSummary["bbox"]) {
  if (!bbox) return 1;
  const w = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  return Math.max(0.01, w / 24);
}
function bboxOf(list: GeoEvent[]): [number, number, number, number] {
  return [
    Math.min(...list.map((e) => e.lng)),
    Math.min(...list.map((e) => e.lat)),
    Math.max(...list.map((e) => e.lng)),
    Math.max(...list.map((e) => e.lat)),
  ];
}
function modePlace(list: GeoEvent[]) {
  const m = new Map<string, number>();
  for (const e of list) m.set(e.place, (m.get(e.place) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
function topCats(list: GeoEvent[]) {
  const m = new Map<string, number>();
  for (const e of list) m.set(e.category, (m.get(e.category) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c, n]) => `${c} (${n})`)
    .join(", ");
}
function fmtRange(a: number, b: number) {
  const f = (t: number) => new Date(t).toISOString().slice(0, 10);
  return f(a) === f(b) ? f(a) : `${f(a)} to ${f(b)}`;
}

import type { Dataset, GeoEvent, Insight } from "../types";

// What the selected time window holds, computed deterministically so the
// briefing model reasons over counted facts rather than over raw rows.
// The same function runs in the browser (for the chips) and on the server
// (for the prompt).
export type WindowStats = {
  from: number;
  to: number;
  count: number;
  prevCount: number;
  total: number;
  byCategory: { name: string; count: number; prev: number }[];
  byPlace: { name: string; count: number; meanValue: number | null }[];
  values: {
    unit: string | null;
    mean: number;
    prevMean: number | null;
    positiveShare: number;
    highest: { id: string; title: string; place: string; date: string; value: number }[];
    lowest: { id: string; title: string; place: string; date: string; value: number }[];
  } | null;
  entities: { name: string; count: number }[];
  insights: Insight[];
  first: { id: string; title: string; place: string; date: string } | null;
  last: { id: string; title: string; place: string; date: string } | null;
};

const day = (t: number) => new Date(t).toISOString().slice(0, 10);
const brief = (e: GeoEvent) => ({ id: e.id, title: e.title, place: e.place, date: day(e.t) });

export function windowStats(ds: Pick<Dataset, "events" | "insights">, from: number, to: number, events: GeoEvent[] = ds.events, bbox: [number, number, number, number] | null = null): WindowStats {
  const len = Math.max(1, to - from);
  const inWin = events.filter((e) => e.t >= from && e.t <= to).sort((a, b) => a.t - b.t);
  const prev = events.filter((e) => e.t >= from - len && e.t < from);

  const count = (list: GeoEvent[], key: (e: GeoEvent) => string | null) => {
    const m = new Map<string, number>();
    for (const e of list) {
      const k = key(e);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const cats = count(inWin, (e) => e.category);
  const prevCats = count(prev, (e) => e.category);
  const byCategory = [...new Set([...cats.keys(), ...prevCats.keys()])]
    .map((name) => ({ name, count: cats.get(name) ?? 0, prev: prevCats.get(name) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const places = new Map<string, { count: number; sum: number; n: number }>();
  for (const e of inWin) {
    const p = places.get(e.place) ?? { count: 0, sum: 0, n: 0 };
    p.count++;
    if (e.value != null && Number.isFinite(e.value)) {
      p.sum += e.value;
      p.n++;
    }
    places.set(e.place, p);
  }
  const byPlace = [...places.entries()]
    .map(([name, p]) => ({ name, count: p.count, meanValue: p.n ? round(p.sum / p.n) : null }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const withVal = inWin.filter((e) => e.value != null && Number.isFinite(e.value));
  let values: WindowStats["values"] = null;
  if (withVal.length >= 3) {
    const units = count(withVal, (e) => e.unit);
    const unit = [...units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const same = unit ? withVal.filter((e) => e.unit === unit) : withVal;
    const prevVals = prev.filter((e) => e.value != null && Number.isFinite(e.value) && (!unit || e.unit === unit));
    const mean = (l: GeoEvent[]) => l.reduce((a, e) => a + (e.value as number), 0) / l.length;
    const sorted = [...same].sort((a, b) => (b.value as number) - (a.value as number));
    const pick = (e: GeoEvent) => ({ ...brief(e), value: e.value as number });
    values = {
      unit,
      mean: round(mean(same)),
      prevMean: prevVals.length ? round(mean(prevVals)) : null,
      positiveShare: round(same.filter((e) => (e.value as number) > 0).length / same.length),
      highest: sorted.slice(0, 5).map(pick),
      lowest: sorted.slice(-5).reverse().map(pick),
    };
  }

  const ents = new Map<string, number>();
  for (const e of inWin) for (const n of e.entities) ents.set(n, (ents.get(n) ?? 0) + 1);
  const entities = [...ents.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Findings that overlap the window and, when a region is given, touch it:
  // by their own box or by having an event inside the view.
  const inView = new Set(events.map((e) => e.id));
  const touches = (i: Insight) => {
    if (!bbox) return true;
    if (i.eventIds.some((id) => inView.has(id))) return true;
    if (i.bbox) return i.bbox[0] <= bbox[2] && i.bbox[2] >= bbox[0] && i.bbox[1] <= bbox[3] && i.bbox[3] >= bbox[1];
    return false;
  };
  const insights = (ds.insights ?? []).filter((i) => i.timeRange && i.timeRange[0] <= to && i.timeRange[1] >= from && touches(i)).slice(0, 8);

  return {
    from,
    to,
    count: inWin.length,
    prevCount: prev.length,
    total: events.length,
    byCategory,
    byPlace,
    values,
    entities,
    insights,
    first: inWin.length ? brief(inWin[0]) : null,
    last: inWin.length ? brief(inWin[inWin.length - 1]) : null,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

// A compact, model-facing rendering of the stats.
export function describeWindow(s: WindowStats): string {
  const lines: string[] = [];
  lines.push(`Window ${day(s.from)} to ${day(s.to)}: ${s.count} of ${s.total} events (previous window of equal length: ${s.prevCount}).`);
  if (s.byCategory.length) lines.push(`By category (count, previous window): ${s.byCategory.map((c) => `${c.name} ${c.count} (${c.prev})`).join("; ")}.`);
  if (s.byPlace.length) lines.push(`Most active places: ${s.byPlace.map((p) => `${p.name} ${p.count}${p.meanValue != null ? ` (mean ${p.meanValue})` : ""}`).join("; ")}.`);
  if (s.values) {
    const v = s.values;
    lines.push(`Values${v.unit ? ` (${v.unit})` : ""}: mean ${v.mean}${v.prevMean != null ? ` vs ${v.prevMean} in the previous window` : ""}; ${Math.round(v.positiveShare * 100)}% positive.`);
    lines.push(`Highest: ${v.highest.map((e) => `${e.title} [${e.id}] ${e.value} (${e.date})`).join("; ")}.`);
    lines.push(`Lowest: ${v.lowest.map((e) => `${e.title} [${e.id}] ${e.value} (${e.date})`).join("; ")}.`);
  }
  if (s.entities.length) lines.push(`Entities mentioned: ${s.entities.map((e) => `${e.name} (${e.count})`).join(", ")}.`);
  if (s.insights.length) lines.push(`Pattern-engine findings overlapping the window:\n${s.insights.map((i) => `- [${i.kind}] ${i.title}: ${i.detail}`).join("\n")}`);
  if (s.first && s.last) lines.push(`First event: ${s.first.title} at ${s.first.place} (${s.first.date}). Last: ${s.last.title} at ${s.last.place} (${s.last.date}).`);
  return lines.join("\n");
}

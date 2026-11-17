import type { Dataset, GeoEvent } from "../types";
import { windowStats } from "./window";

// Evidence for the discovery pass: the whole story reduced to computed facts
// the model can connect. Slices through time, each place's trajectory when
// the events carry a value, how categories diverge, what the documents say,
// and the pattern engine's findings.
const day = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 86400000;

export function discoveryEvidence(ds: Pick<Dataset, "events" | "summary" | "insights" | "sources">): string {
  const ev = ds.events;
  const s = ds.summary;
  if (!ev.length || s.tMin == null || s.tMax == null) return "No events.";
  const out: string[] = [];
  const span = s.tMax - s.tMin;
  const sliceMs = span > 4 * 365 * DAY ? 365.25 * DAY : span > 400 * DAY ? 91.3 * DAY : span > 60 * DAY ? 30.4 * DAY : 7 * DAY;
  const n = Math.min(12, Math.max(2, Math.ceil(span / sliceMs)));
  const step = span / n;

  // 1. Slices through time
  out.push(`Time slices (${n}):`);
  for (let i = 0; i < n; i++) {
    const a = s.tMin + i * step;
    const b = i === n - 1 ? s.tMax : s.tMin + (i + 1) * step - 1;
    const w = windowStats({ events: ev, insights: [] }, a, b);
    if (!w.count) continue;
    const cats = w.byCategory.slice(0, 6).map((c) => `${c.name} ${c.count}`).join(", ");
    let vals = "";
    if (w.values) {
      const byCat = new Map<string, number[]>();
      for (const e of ev) if (e.t >= a && e.t <= b && e.value != null && e.unit === w.values.unit) (byCat.get(e.category) ?? byCat.set(e.category, []).get(e.category)!).push(e.value);
      const means = [...byCat.entries()]
        .filter(([, v]) => v.length >= 3)
        .map(([c, v]) => `${c} ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1)}`)
        .slice(0, 6)
        .join(", ");
      vals = ` | mean value ${w.values.mean}${w.values.unit ? " " + w.values.unit : ""}, ${Math.round(w.values.positiveShare * 100)}% positive${means ? `; by category: ${means}` : ""} | highest: ${w.values.highest.slice(0, 3).map((h) => `${h.place} ${h.value} [${h.id}]`).join("; ")} | lowest: ${w.values.lowest.slice(0, 3).map((h) => `${h.place} ${h.value} [${h.id}]`).join("; ")}`;
    }
    out.push(`- ${day(a)} to ${day(b)}: ${w.count} events | ${cats}${vals}`);
  }

  // 2. Trajectories per place for valued events in the dominant unit
  const unitCount = new Map<string, number>();
  for (const e of ev) if (e.value != null && e.unit) unitCount.set(e.unit, (unitCount.get(e.unit) ?? 0) + 1);
  const unit = [...unitCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (unit) {
    const byPlace = new Map<string, GeoEvent[]>();
    for (const e of ev) if (e.value != null && e.unit === unit) (byPlace.get(e.place) ?? byPlace.set(e.place, []).get(e.place)!).push(e);
    const traj = [...byPlace.entries()]
      .filter(([, l]) => l.length >= 6)
      .map(([place, l]) => {
        l.sort((a, b) => a.t - b.t);
        const peak = l.reduce((m, e) => ((e.value as number) > (m.value as number) ? e : m));
        const trough = l.reduce((m, e) => ((e.value as number) < (m.value as number) ? e : m));
        const latest = l[l.length - 1];
        const turns: string[] = [];
        for (let i = 1; i < l.length; i++) {
          const a = l[i - 1].value as number, b = l[i].value as number;
          if (a >= 0 && b < 0) turns.push(`negative ${day(l[i].t)}`);
          else if (a < 0 && b >= 0) turns.push(`positive ${day(l[i].t)}`);
        }
        const swing = (peak.value as number) - (trough.value as number);
        return { place, swing, line: `${place}: peak ${(peak.value as number).toFixed(1)} (${day(peak.t)}) [${peak.id}], trough ${(trough.value as number).toFixed(1)} (${day(trough.t)}) [${trough.id}], latest ${(latest.value as number).toFixed(1)} (${day(latest.t)})${turns.length ? `, turned ${turns.slice(0, 4).join(", ")}` : ""}` };
      })
      .sort((a, b) => b.swing - a.swing);
    if (traj.length) {
      out.push(`\nTrajectories (${unit}), ${traj.length} places with 6+ readings, largest swings first; then the steadiest:`);
      for (const t of traj.slice(0, 22)) out.push(`- ${t.line}`);
      for (const t of traj.slice(-6)) if (!traj.slice(0, 22).includes(t)) out.push(`- ${t.line}`);
    }
  }

  // 3. What the documents say: events from prose sources, spread over time
  const tables = new Set(ds.sources.filter((f) => f.kind === "table").map((f) => f.name));
  const docs = ev.filter((e) => !tables.has(e.sourceFile)).sort((a, b) => a.t - b.t);
  if (docs.length) {
    const pick = docs.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 70)) === 0).slice(0, 70);
    out.push(`\nFrom the documents (${docs.length} located, dated statements; a sample):`);
    for (const e of pick) out.push(`- ${day(e.t)} | ${e.place} | ${e.title}${e.value != null ? ` | ${e.value} ${e.unit ?? ""}` : ""} | ${e.sourceFile} [${e.id}]`);
  }

  // 4. Pattern engine
  const ins = (ds.insights ?? []).slice(0, 10);
  if (ins.length) {
    out.push("\nPattern engine (statistical):");
    for (const i of ins) out.push(`- [${i.kind}] ${i.title}: ${i.detail}`);
  }
  return out.join("\n");
}

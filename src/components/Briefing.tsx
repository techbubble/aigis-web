"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContextTopic, Dataset } from "@/lib/types";
import type { Brief, BriefFinding, BriefSource } from "@/lib/ai/brief";
import { windowStats } from "@/lib/analysis/window";
import { inBounds, type Filter } from "./explorer-state";

const day = (t: number) => new Date(t).toISOString().slice(0, 10);

type Partial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? Partial<U>[] : T[K] extends object ? Partial<T[K]> : T[K] };
type PartialBrief = Partial<Brief>;

const PRIORITY: Record<BriefFinding["priority"], { label: string; color: string }> = {
  high: { label: "High", color: "#f87171" },
  medium: { label: "Medium", color: "#fbbf24" },
  low: { label: "Low", color: "#64748b" },
};
const KIND: Record<BriefFinding["kind"], string> = {
  trend: "Trend",
  "turning-point": "Turning point",
  divergence: "Divergence",
  outlier: "Outlier",
  leader: "Leader",
  comparison: "Comparison",
  context: "From the web",
};

// The intelligence layer over the map: what the selected window holds inside
// the region in view, in numbers computed here, and a streamed briefing of
// findings as cards ranked by priority, each with its dates, places and the
// number that proves it.
export function Briefing({
  dataset,
  window: win,
  viewBounds,
  filter,
  contexts,
  onContexts,
  children,
}: {
  dataset: Dataset;
  window: [number, number];
  // The region the map shows; the briefing is about the events inside it.
  viewBounds: [number, number, number, number] | null;
  filter: Filter;
  contexts: ContextTopic[];
  onContexts: (ids: string[]) => void;
  // Rendered under the analysis, inside the same tab.
  children?: ReactNode;
}) {
  const [tab, setTab] = useState<"analysis" | "research">("analysis");
  const [brief, setBrief] = useState<PartialBrief | null>(null);
  const [sources, setSources] = useState<BriefSource[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The window, region and context set the current briefing was written for.
  const [writtenFor, setWrittenFor] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const enabled = useMemo(() => contexts.filter((t) => t.enabled).map((t) => t.id), [contexts]);
  // Bounds rounded so a sub-pixel drift does not count as a new region.
  const bb = useMemo(() => (viewBounds ? (viewBounds.map((v) => Math.round(v * 100) / 100) as [number, number, number, number]) : null), [viewBounds]);
  const events = useMemo(() => {
    const pc = filter.placeContains?.toLowerCase() ?? null;
    const cats = filter.categories ? new Set(filter.categories.map((c) => c.toLowerCase())) : null;
    return inBounds(dataset.events, bb).filter((e) => (!cats || cats.has(e.category)) && (!pc || e.place.toLowerCase().includes(pc)));
  }, [dataset, bb, filter.categories, filter.placeContains]);
  const stats = useMemo(() => windowStats(dataset, win[0], win[1], events, bb), [dataset, win, events, bb]);
  const key = `${win[0]}:${win[1]}:${bb?.join(",") ?? ""}:${filter.categories?.join(",") ?? ""}:${filter.placeContains ?? ""}:${enabled.join(",")}`;
  const stale = writtenFor !== null && writtenFor !== key;

  const analyze = async () => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setBusy(true);
    setError(null);
    setBrief(null);
    setSources([]);
    setWrittenFor(key);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ datasetId: dataset.id, from: win[0], to: win[1], bbox: bb, filter: { categories: filter.categories, placeContains: filter.placeContains }, contexts: enabled }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({ error: `HTTP ${res.status}` }))).error);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const msg = JSON.parse(l) as { sources?: BriefSource[]; brief?: PartialBrief; error?: string };
          if (msg.sources) setSources(msg.sources);
          if (msg.brief) setBrief(msg.brief);
          if (msg.error) setError(msg.error);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      if (abort.current === ac) setBusy(false);
    }
  };

  // A briefing on open, then a fresh one whenever the window, the region or
  // the context set settles somewhere new: the reader never has to ask.
  const first = useRef(true);
  const empty = stats.count === 0;
  useEffect(() => {
    if (empty) {
      // Nothing in view: drop the old briefing rather than leave it standing
      // over a region and window it does not describe.
      abort.current?.abort();
      const t = setTimeout(() => {
        setBrief(null);
        setBusy(false);
        setWrittenFor(key);
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => void analyze(), first.current ? 0 : 800);
    first.current = false;
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, empty]);

  const toggle = (id: string) => onContexts(enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id]);
  const v = stats.values;
  const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(Math.abs(n) >= 10 ? 1 : 2));
  const delta = stats.prevCount ? Math.round(((stats.count - stats.prevCount) / stats.prevCount) * 100) : null;
  const shown = stale ? null : brief;
  const findings = (shown?.findings ?? []).filter((f): f is Partial<BriefFinding> & { title: string } => typeof f?.title === "string" && f.title.length > 0);
  const cite = (n: number) => sources.find((s) => s.n === n);

  const tabs = (
    <div className="flex overflow-hidden rounded-xl bg-ink/70 p-1 text-xs shadow-inner">
      <button onClick={() => setTab("analysis")} aria-pressed={tab === "analysis"} className={`flex-1 rounded-lg px-3 py-2 font-semibold transition ${tab === "analysis" ? "bg-glow text-ink shadow" : "text-mist hover:text-fog"}`}>
        Analysis
      </button>
      <button onClick={() => setTab("research")} aria-pressed={tab === "research"} className={`flex-1 rounded-lg px-3 py-2 font-semibold transition ${tab === "research" ? "bg-glow text-ink shadow" : "text-mist hover:text-fog"}`}>
        Research{enabled.length ? ` (${enabled.length} on)` : ""}
      </button>
    </div>
  );

  if (tab === "research") {
    return (
      <div className="space-y-3">
        {tabs}
        <div className="text-xs leading-relaxed text-mist">
          Pick what AIGIS should look up on the web for the dates and places on the map. Each selection adds cited findings to the analysis.
          {contexts.length === 0 ? " No research topics were proposed for this story." : ""}
        </div>
        <div className="space-y-1.5">
          {contexts.map((t) => {
            const on = enabled.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggle(t.id)} aria-pressed={on} className={`tile flex w-full items-start gap-3 rounded-xl p-3.5 text-left transition ${on ? "" : "opacity-80 hover:opacity-100"}`} style={{ "--tint": on ? "var(--glow)" : "var(--ink-3)" } as React.CSSProperties}>
                <span className={`mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition ${on ? "bg-glow" : "bg-line"}`}>
                  <span className={`h-3 w-3 rounded-full bg-ink transition ${on ? "translate-x-3" : ""}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fog">{t.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-mist">{t.why}</span>
                  {t.sources.length > 0 && <span className="mt-1 block truncate text-[10px] text-dim">{t.sources.join(" · ")}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tabs}
      <div className="text-xs text-mist">
        {empty ? "No events" : <b className="text-fog">{stats.count.toLocaleString()} events</b>} on the map between <b className="text-fog">{day(win[0])}</b> and <b className="text-fog">{day(win[1])}</b>. Pan, zoom or move the window to change what is analyzed.
      </div>

      {/* The window in numbers, before any model has spoken. */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {delta != null && delta !== 0 && (
          <Chip>
            <span className={delta > 0 ? "text-emerald-300" : "text-rose-300"}>
              {delta > 0 ? "+" : ""}
              {delta}% events
            </span>{" "}
            vs the window before
          </Chip>
        )}
        {stats.byPlace.length > 0 && (
          <Chip>
            {stats.byPlace.slice(0, 3).map((p) => p.name).join(", ")}
            {stats.byPlace.length > 3 ? ` and ${stats.byPlace.length - 3} more places` : ""}
          </Chip>
        )}
        {stats.byCategory.slice(0, 3).map((c) => (
          <Chip key={c.name}>
            {c.name} <b className="text-fog">{c.count}</b>
            {c.prev ? <span className="text-dim"> ({c.prev})</span> : null}
          </Chip>
        ))}
        {v && (
          <Chip>
            mean <b className="text-fog">{fmt(v.mean)}</b>
            {v.unit ? ` ${v.unit}` : ""}
            {v.prevMean != null ? <span className="text-dim"> was {fmt(v.prevMean)}</span> : null}
          </Chip>
        )}
      </div>

      {/* The verdict */}
      {shown?.headline ? (
        <div className="tile-verdict rounded-xl px-4 py-3.5 text-base font-semibold leading-snug text-ink">{shown.headline}</div>
      ) : empty ? (
        <div className="tile rounded-xl px-4 py-3 text-xs text-mist">No events in this window inside the region on the map. Widen the window or move the map.</div>
      ) : (
        <div className="tile rounded-xl px-4 py-3 text-xs text-mist">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-glow align-middle" />
          {enabled.length ? "Researching the web and reading " : "Reading "}
          {stats.count.toLocaleString()} events

        </div>
      )}

      {/* Findings as cards */}
      {findings.map((f, i) => {
        const pr = PRIORITY[f.priority ?? "low"];
        const m = f.metric;
        const dir = m?.direction;
        const dirColor = dir === "up" ? "text-emerald-300" : dir === "down" ? "text-rose-300" : "text-fog";
        return (
          <div key={i} className="tile relative overflow-hidden rounded-xl p-4 pl-5" style={{ "--tint": pr.color } as React.CSSProperties}>
            <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: pr.color }} />
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider" style={{ background: pr.color + "22", color: pr.color }}>
                {pr.label}
              </span>
              {f.kind && <span className="uppercase tracking-wider text-dim">{KIND[f.kind]}</span>}
              {f.when && <span className="ml-auto font-mono text-dim">{f.when}</span>}
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold leading-snug text-fog">{f.title}</div>
                {f.detail && <div className="mt-1.5 text-[13px] leading-relaxed text-mist">{f.detail}</div>}
              </div>
              {m?.value && (
                <div className="shrink-0 text-right">
                  <div className={`font-mono text-2xl font-semibold leading-none ${dirColor}`}>
                    {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}
                    {m.value}
                  </div>
                  {m.label && <div className="mt-1 text-[10px] text-dim">{m.label}</div>}
                  {m.change && <div className="text-[10px] text-dim">{m.change}</div>}
                </div>
              )}
            </div>
            {((f.places?.length ?? 0) > 0 || (f.cites?.length ?? 0) > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                {f.places?.filter((p): p is string => typeof p === "string").map((p) => (
                  <span key={p} className="rounded-full bg-ink/60 px-2 py-0.5 text-mist">
                    {p}
                  </span>
                ))}
                {f.cites
                  ?.filter((n): n is number => typeof n === "number")
                  .map((n) => {
                    const s = cite(n);
                    return s ? (
                      <a key={n} href={s.url} target="_blank" rel="noreferrer" title={s.title} className="rounded-full border border-glow/40 px-2 py-0.5 text-glow hover:bg-glow/10">
                        [{n}]
                      </a>
                    ) : null;
                  })}
              </div>
            )}
          </div>
        );
      })}

      {/* Hypotheses */}
      {(shown?.hypotheses ?? []).filter((h) => h?.claim).length > 0 && (
        <div className="tile rounded-xl p-4" style={{ "--tint": "var(--glow-2)" } as React.CSSProperties}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-dim">May mean</div>
          <ul className="mt-1.5 space-y-1.5">
            {shown!.hypotheses!.filter((h) => h?.claim).map((h, i) => (
              <li key={i} className="text-xs leading-relaxed text-mist">
                <span className="text-fog">{h.claim}</span>
                {h.basis ? <span className="text-dim"> {h.basis}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && !stale && (
        <div className="text-[10px] text-dim">
          Sources:{" "}
          {sources.map((s, i) => (
            <span key={s.n}>
              {i > 0 ? " · " : ""}
              <a href={s.url} target="_blank" rel="noreferrer" className="text-mist hover:text-fog hover:underline">
                [{s.n}] {s.title}
              </a>
            </span>
          ))}
        </div>
      )}

      {error && <div className="text-xs text-red-300">{error}</div>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-dim">{busy ? "Writing" : stale ? "Updating for the new view" : ""}</span>
        <button onClick={analyze} disabled={busy || empty} className="rounded-md border border-line px-3 py-1 text-xs text-mist hover:text-fog disabled:opacity-40">
          {busy ? "Analyzing" : "Analyze again"}
        </button>
      </div>
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-ink/60 px-2 py-0.5 text-mist">{children}</span>;
}

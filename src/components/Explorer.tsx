"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_MARKER, type Dataset, type Insight, type MarkerStyle } from "@/lib/types";
import type { FocusMapInputT } from "@/lib/ai/tools";
import { applyFilter, bboxOf, EMPTY_FILTER, rangeOf, type Filter } from "./explorer-state";
import { defaultPeriod, periodBounds, type Period } from "@/lib/period";
import { MapView } from "./MapView";
import { Timeline } from "./Timeline";
import { DetailPanel } from "./DetailPanel";
import { ChatPanel, type ChatHandle } from "./ChatPanel";
import { DesignPanel } from "./DesignPanel";
import { SourcesPanel, type LibraryItem } from "./SourcesPanel";
import type { Sample } from "@/lib/samples";
import { Logo } from "@/components/Logo";
import { buildStyle, isDarkTheme, themeById, type Theme } from "@/lib/map/styles";
import { LookOverlay } from "./LookOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useClickOutside } from "@/lib/use-click-outside";

const PLAY_SECONDS = 45;

export function Explorer({
  dataset: initial,
  suggestions,
  defaultTheme,
  mode,
  editable,
  samples = [],
  library = [],
  looks: initialLooks = [],
}: {
  dataset: Dataset;
  suggestions: string[];
  defaultTheme: string;
  mode: "studio" | "view";
  editable: boolean;
  samples?: Sample[];
  library?: LibraryItem[];
  // Looks designed in Studio, alongside the built-ins.
  looks?: Theme[];
}) {
  const studio = mode === "studio";
  // The dataset is held in state so the sources panel can swap in a fresh
  // copy after documents are added or removed.
  const [dataset, setDataset] = useState(initial);
  // An Aigis that has not been built yet: Studio opens on the sources panel
  // and the first upload creates it.
  const isNew = !dataset.id;
  const hasEvents = dataset.events.length > 0;
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const events = useMemo(() => applyFilter(dataset, filter), [dataset, filter]);
  const range = useMemo(() => rangeOf(dataset, filter), [dataset, filter]);
  const span = range[1] - range[0];

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [period, setPeriod] = useState<Period>(() => defaultPeriod(span, events.length));
  const [cumulative, setCumulative] = useState(false);
  // The time window is the region the map shows. It slides across the range
  // when playing; in cumulative mode its start is pinned to the range start.
  // Start in the middle of the story rather than at its first event.
  const [rawWin, setWin] = useState<[number, number]>(() => periodBounds(range[0] + span / 2, defaultPeriod(span, events.length)));
  const win = useMemo<[number, number]>(() => {
    const MINW = 60000;
    if (cumulative) return [range[0], Math.min(range[1], Math.max(range[0] + MINW, rawWin[1]))];
    const w = Math.min(Math.max(rawWin[1] - rawWin[0], MINW), span * 1.2 + MINW);
    let from = rawWin[0];
    if (from + w < range[0] + MINW) from = range[0] + MINW - w;
    if (from > range[1] - MINW) from = range[1] - MINW;
    return [from, from + w];
  }, [rawWin, range, span, cumulative]);
  const [pFrom, pTo] = win;
  const cursor = pTo;
  // The camera always follows: it re-frames on whatever the time window shows.
  const [followBounds, setFollowBounds] = useState<[number, number, number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Set<string> | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(() => dataset.summary.bbox);
  const [boundsKey, setBoundsKey] = useState(0);
  const [panel, setPanel] = useState<"chat" | "design" | "look" | "sources">(studio ? "sources" : "chat");
  // The panel is always open on wide screens. On phones it covers the map,
  // so there it opens from the menu and can be put away again.
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia("(min-width: 768px)").matches, () => true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelOpen = wide || mobileOpen;
  // The chat input is made as tall as the timeline bar so the two line up.
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineH, setTimelineH] = useState(0);
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTimelineH(el.getBoundingClientRect().height + 12));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasEvents]);
  const chatRef = useRef<ChatHandle | null>(null);
  const [themeId, setThemeId] = useState(defaultTheme);
  const [marker, setMarker] = useState<MarkerStyle>({ ...DEFAULT_MARKER, ...(dataset.marker ?? {}) });
  const markerColor = marker.color;
  const [saved, setSaved] = useState<{ theme: string; marker: MarkerStyle; at: string | null }>({ theme: defaultTheme, marker: { ...DEFAULT_MARKER, ...(dataset.marker ?? {}) }, at: dataset.savedAt ?? null });
  const [saving, setSaving] = useState(false);
  const dirty = studio && !isNew && (saved.theme !== themeId || JSON.stringify(saved.marker) !== JSON.stringify(marker));
  const savedAt = saved.at;
  const save = async () => {
    if (!studio || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/datasets/${dataset.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: themeId, marker }) });
      const j = (await res.json()) as { savedAt?: string };
      if (res.ok) setSaved({ theme: themeId, marker, at: j.savedAt ?? new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };
  const [looks, setLooks] = useState<Theme[]>(initialLooks);
  const theme = useMemo(() => themeById(themeId, looks), [themeId, looks]);
  const mapStyle = useMemo(() => buildStyle(theme), [theme]);

  // Animation loop: the window travels across the range (or its end does, in cumulative mode).
  const winRef = useRef(win);
  useEffect(() => {
    winRef.current = win;
  }, [win]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const perMs = (span / (PLAY_SECONDS * 1000)) * speed;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const [a, b] = winRef.current;
      const d = dt * perMs;
      if (cumulative) {
        if (b + d >= range[1]) {
          setWin([range[0], range[1]]);
          setPlaying(false);
          return;
        }
        setWin([range[0], b + d]);
      } else {
        if (a + d >= range[1]) {
          setPlaying(false);
          return;
        }
        setWin([a + d, b + d]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, span, range, cumulative]);

  // Events the map is showing right now; the camera re-frames only when this set changes.
  const visible = useMemo(() => (cumulative ? events.filter((e) => e.t <= pTo) : events.filter((e) => e.t < pTo && (e.tEnd ?? e.t) >= pFrom)), [events, cumulative, pFrom, pTo]);
  const visibleKey = useMemo(() => visible.map((e) => e.id).join(","), [visible]);
  useEffect(() => {
    const h = setTimeout(
      () => {
        const bb = bboxOf(visible);
        if (bb) setFollowBounds((prev) => (prev && prev.every((v, i) => v === bb[i]) ? prev : bb));
      },
      playing ? 0 : 160,
    );
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, playing]);

  const selected = useMemo(() => (selectedId ? dataset.events.find((e) => e.id === selectedId) ?? null : null), [dataset, selectedId]);

  const focus = useCallback(
    (f: FocusMapInputT) => {
      const tr = f.timeRange && f.timeRange.length === 2 ? ([Date.parse(f.timeRange[0]), Date.parse(f.timeRange[1])] as [number, number]) : null;
      const validTr = tr && Number.isFinite(tr[0]) && Number.isFinite(tr[1]) && tr[1] > tr[0] ? tr : null;
      const nf: Filter = {
        timeRange: validTr,
        categories: f.categories && f.categories.length ? f.categories.map((c) => c.toLowerCase()) : null,
        placeContains: f.placeContains || null,
        eventIds: f.eventIds && f.eventIds.length ? f.eventIds : null,
      };
      setFilter(nf);
      const ids = nf.eventIds ? new Set(nf.eventIds) : null;
      setHighlight(ids);
      setCaption(f.caption || null);
      const subset = applyFilter(dataset, nf);
      const focusList = ids ? subset.filter((e) => ids.has(e.id)) : subset;
      // Frame the matched events; fall back to the model's bbox only when nothing matched.
      const bb = bboxOf(focusList.length ? focusList : subset) ?? (f.bbox && f.bbox.length === 4 ? (f.bbox as [number, number, number, number]) : null);
      if (bb) {
        setBounds(bb);
        setBoundsKey((k) => k + 1);
      }
      const r = rangeOf(dataset, nf);
      const newSpan = r[1] - r[0];
      if (f.play) {
        const np = defaultPeriod(newSpan, subset.length);
        setCumulative(false);
        setPeriod(np);
        setWin(periodBounds(r[0], np));
        setPlaying(true);
      } else {
        // Show everything in the focused range at once.
        setPlaying(false);
        setCumulative(true);
        setWin([r[0], r[1]]);
      }
      if (focusList.length === 1) setSelectedId(focusList[0].id);
    },
    [dataset],
  );

  const pickInsight = (i: Insight) => {
    focus({
      timeRange: i.timeRange ? [new Date(i.timeRange[0]).toISOString(), new Date(i.timeRange[1]).toISOString()] : null,
      categories: null,
      placeContains: null,
      eventIds: i.eventIds.length ? i.eventIds : null,
      bbox: i.bbox,
      play: false,
      caption: i.title,
    });
  };

  const reset = () => {
    setFilter(EMPTY_FILTER);
    setHighlight(null);
    setCaption(null);
    setSelectedId(null);
    setCumulative(false);
    const tMin = dataset.summary.tMin ?? 0;
    const np = defaultPeriod((dataset.summary.tMax ?? tMin) - tMin, dataset.events.length);
    setPeriod(np);
    setBounds(dataset.summary.bbox);
    setBoundsKey((k) => k + 1);
    setWin(periodBounds(tMin, np));
    setPlaying(false);
  };

  const ask = (q: string) => {
    setPanel("chat");
    setMobileOpen(true);
    chatRef.current?.ask(q);
  };

  const filtered = filter !== EMPTY_FILTER && (filter.timeRange || filter.categories || filter.placeContains || filter.eventIds);

  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  useClickOutside(switcherRef, switcherOpen, () => setSwitcherOpen(false));
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, menuOpen, () => setMenuOpen(false));
  // Tabs inside the right panel. The bar only opens and closes the panel.
  const tabs: { id: "sources" | "design" | "look" | "chat"; label: string }[] = [
    ...(studio ? [{ id: "sources" as const, label: "General" }] : []),
    ...(studio ? [{ id: "design" as const, label: `Design${dirty && saved.marker !== marker ? " •" : ""}` }] : []),
    ...(studio ? [{ id: "look" as const, label: `Look${dirty && saved.theme !== themeId ? " •" : ""}` }] : []),
    ...(!isNew ? [{ id: "chat" as const, label: "Explore" }] : []),
  ];
  // Edit | View: one control, only for people who can edit.
  const modeToggle =
    !isNew && editable ? (
      <span className="ml-1 inline-flex rounded-lg border border-line p-0.5 text-xs">
        <Link href={`/studio/${dataset.id}`} className={`rounded-md px-2.5 py-1 ${studio ? "bg-fog font-medium text-ink" : "text-mist hover:text-fog"}`} aria-current={studio ? "page" : undefined}>
          Edit
        </Link>
        <Link href={`/view/${dataset.id}`} className={`rounded-md px-2.5 py-1 ${!studio ? "bg-fog font-medium text-ink" : "text-mist hover:text-fog"}`} aria-current={!studio ? "page" : undefined}>
          View
        </Link>
      </span>
    ) : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: theme.background, colorScheme: isDarkTheme(theme) ? "dark" : "light" }}>
      <div className="absolute inset-0">
        <MapView
          events={events}
          color={markerColor}
          cursor={cursor}
          from={pFrom}
          to={pTo}
          cumulative={cumulative}
          highlight={highlight}
          selectedId={selectedId}
          trail={marker.trail}
          bounds={bounds}
          boundsKey={boundsKey}
          followBounds={followBounds}
          mapStyle={mapStyle}
          marker={marker}
          onSelect={setSelectedId}
        />
        <LookOverlay theme={theme} />
      </div>

      {/* Top bar: one fixed bar. Name in the centre switches between Aigises;
          actions on the right collapse into a menu on small screens. */}
      <header className="absolute inset-x-0 top-0 z-30 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-line bg-ink/85 px-3 backdrop-blur md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start text-base font-semibold tracking-[0.12em] hover:text-glow">
          <Logo size={32} /> <span className="hidden sm:inline">AIGIS</span>
        </Link>

        <div ref={switcherRef} className="relative min-w-0 justify-self-center">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex max-w-[60vw] items-center gap-1.5 rounded-lg px-2 py-1.5 text-base font-semibold tracking-tight hover:bg-ink-3 md:max-w-lg md:text-lg"
            aria-haspopup="menu"
            aria-expanded={switcherOpen}
          >
            <span className="min-w-0">
              <span className="block truncate">{dataset.name}</span>
              {dataset.subtitle && <span className="-mt-0.5 block truncate text-[11px] font-normal tracking-normal text-mist">{dataset.subtitle}</span>}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-dim">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          {switcherOpen && (
            <>
              <div role="menu" className="absolute left-1/2 top-full z-40 mt-2 w-[320px] max-w-[92vw] -translate-x-1/2 rounded-xl border border-line bg-ink/95 p-1.5 shadow-2xl backdrop-blur">
                <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-dim">Your Aigises</div>
                <ul className="scroll-thin max-h-[60vh] overflow-auto">
                  {library.map((d) => {
                    const current = d.id === dataset.id;
                    return (
                      <li key={d.id}>
                        <Link
                          href={`/${studio ? "studio" : "view"}/${d.id}`}
                          onClick={() => setSwitcherOpen(false)}
                          className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm ${current ? "bg-ink-3 text-fog" : "text-mist hover:bg-ink-3 hover:text-fog"}`}
                          role="menuitem"
                        >
                          <span className="truncate">{d.name}</span>
                          <span className="shrink-0 font-mono text-[10px] text-dim">{d.count}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {studio && (
                  <Link href="/studio" onClick={() => setSwitcherOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg border-t border-line px-2.5 py-2 text-sm text-glow hover:bg-ink-3" role="menuitem">
                    <span className="text-base leading-none">+</span> New Aigis
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        <nav className="hidden items-center gap-1 justify-self-end md:flex">
          {filtered && (
            <button onClick={reset} className="rounded-lg px-3 py-1.5 text-sm text-mist hover:text-fog">
              Reset view
            </button>
          )}
          {studio && dirty && (
            <button onClick={save} disabled={saving} className="ml-1 rounded-lg bg-glow px-3 py-1.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-60" title="Save design changes">
              {saving ? "Saving" : "Save"}
            </button>
          )}
          {modeToggle}
          <span className="ml-1 border-l border-line pl-2">
            <ThemeToggle />
          </span>
        </nav>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-mist hover:bg-ink-3 hover:text-fog md:hidden"
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
            {menuOpen ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M3 5h12M3 9h12M3 13h12" />}
          </svg>
        </button>
      </header>

      {menuOpen && (
        <div ref={menuRef} className="absolute inset-x-3 top-16 z-40 rounded-xl border border-line bg-ink/95 p-2 shadow-2xl backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-2 py-1.5">
            {modeToggle ?? <span />}
            <ThemeToggle />
          </div>
          {filtered && (
            <button onClick={() => (reset(), setMenuOpen(false))} className="w-full rounded-lg px-3 py-2 text-left text-sm text-mist hover:bg-ink-3 hover:text-fog">
              Reset view
            </button>
          )}
          <button
            onClick={() => (setMobileOpen(false), setMenuOpen(false))}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!mobileOpen ? "bg-fog text-ink" : "text-mist hover:bg-ink-3 hover:text-fog"}`}
          >
            Map
          </button>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => (setPanel(t.id), setMobileOpen(true), setMenuOpen(false))}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${mobileOpen && panel === t.id ? "bg-fog text-ink" : "text-mist hover:bg-ink-3 hover:text-fog"}`}
            >
              {t.label}
            </button>
          ))}
          {studio && dirty && (
            <button onClick={() => (save(), setMenuOpen(false))} disabled={saving} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-glow">
              {saving ? "Saving" : "Save"}
            </button>
          )}
        </div>
      )}

      {/* Caption */}
      {caption && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2">
          <div className="rounded-full border border-glow/40 bg-ink/85 px-4 py-1.5 text-sm text-fog backdrop-blur">{caption}</div>
        </div>
      )}

      <DetailPanel event={selected} color={markerColor} onClose={() => setSelectedId(null)} onAsk={ask} />

      {/* Right panel */}
      <aside
        className={`absolute right-0 top-0 z-20 flex h-full w-[400px] max-w-[92vw] flex-col border-l border-line bg-ink/95 pt-14 backdrop-blur transition-[translate,visibility] duration-300 ${
          panelOpen ? "translate-x-0" : "invisible translate-x-full"
        }`}
        inert={!panelOpen}
      >
        {tabs.length > 1 && (
          <div className="flex items-stretch border-b border-line" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={panel === t.id}
                onClick={() => setPanel(t.id)}
                className={`-mb-px flex-1 border-b-2 px-3 py-2.5 text-center text-sm transition ${panel === t.id ? "border-glow text-fog" : "border-transparent text-mist hover:text-fog"}`}
              >
                {t.label}
              </button>
            ))}
            <button onClick={() => setMobileOpen(false)} className="px-3 text-dim hover:text-fog md:hidden" aria-label="Show map">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1">
          {!isNew && (
            <div className={panel === "chat" ? "h-full" : "hidden"}>
              <ChatPanel datasetId={dataset.id} suggestions={suggestions} insights={dataset.insights ?? []} onPickInsight={pickInsight} onFocus={focus} handleRef={chatRef} inputHeight={wide ? timelineH : 0} />
            </div>
          )}
          {panel === "sources" && studio && (
            <SourcesPanel dataset={dataset} isNew={isNew} editable={editable} themeId={themeId} defaultTheme={defaultTheme} samples={samples} library={library} onChanged={setDataset} />
          )}
          {(panel === "design" || panel === "look") && studio && (
            <DesignPanel
              view={panel}
              looks={looks}
              onLooks={setLooks}
              themeId={themeId}
              marker={marker}
              dirty={dirty}
              saving={saving}
              savedAt={savedAt}
              onTheme={setThemeId}
              onMarker={setMarker}
              onSave={save}
            />
          )}
        </div>
      </aside>

      {/* Timeline */}
      {hasEvents && (
      <div ref={timelineRef} className={`pointer-events-none absolute bottom-3 left-3 right-3 z-30 transition-all ${panelOpen ? "hidden md:block md:right-[412px]" : ""}`}>
        <Timeline
          events={events}
          color={markerColor}
          range={range}
          window={win}
          playing={playing}
          speed={speed}
          period={period}
          cumulative={cumulative}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onWindow={setWin}
          onPlay={(p) => {
            if (p) {
              const [a, b] = winRef.current;
              if (cumulative ? b >= range[1] - 1 : a >= range[1] - 60000) setWin(cumulative ? [range[0], range[0] + 60000] : periodBounds(range[0], period));
            }
            setPlaying(p);
          }}
          onSpeed={setSpeed}
          onPeriod={setPeriod}
          onCumulative={setCumulative}
        />
      </div>
      )}
      {isNew && !panelOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 text-center text-sm text-mist">Open Sources from the menu to drop the files for this Aigis.</div>
      )}
    </div>
  );
}

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}



"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_MARKER, type Dataset, type MapCamera, type MarkerStyle } from "@/lib/types";
import type { FocusMapInputT } from "@/lib/ai/tools";
import { applyFilter, bboxOf, EMPTY_FILTER, halfWindow, rangeOf, type Filter } from "./explorer-state";
import { defaultPeriod, type Period } from "@/lib/period";
import { MapView } from "./MapView";
import { Timeline } from "./Timeline";
import { DetailPanel } from "./DetailPanel";
import { ChatPanel, type ChatHandle } from "./ChatPanel";
import { DesignPanel } from "./DesignPanel";
import { SourcesPanel, type LibraryItem } from "./SourcesPanel";
import { Logo } from "@/components/Logo";
import { buildStyle, isDarkTheme, themeById } from "@/lib/map/styles";
import { LookOverlay } from "./LookOverlay";
import { useClickOutside } from "@/lib/use-click-outside";
import { AccountMenu, type SessionUser } from "./AccountMenu";


export function Explorer({
  dataset: initial,
  suggestions,
  defaultTheme,
  mode,
  editable,
  user = null,
  library = [],
}: {
  dataset: Dataset;
  suggestions: string[];
  defaultTheme: string;
  mode: "studio" | "view";
  editable: boolean;
  user?: SessionUser;
  library?: LibraryItem[];
  // Looks designed in Studio, alongside the built-ins.
}) {
  const studio = mode === "studio";
  // The dataset is held in state so the sources panel can swap in a fresh
  // copy after documents are added or removed.
  const [dataset, setDataset] = useState(initial);
  // A story that has not been built yet: Studio opens on the sources panel
  // and the first upload creates it.
  const isNew = !dataset.id;
  const hasEvents = dataset.events.length > 0;
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  // Outside context topics proposed at ingest. Toggles persist on the story
  // for people who can edit it; viewers' choices last for the visit.
  const [contexts, setContexts] = useState(dataset.contexts ?? []);
  const setEnabledContexts = useCallback(
    (ids: string[]) => {
      const on = new Set(ids);
      setContexts((cs) => cs.map((t) => ({ ...t, enabled: on.has(t.id) })));
      if (editable && dataset.id) void fetch(`/api/datasets/${dataset.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ contexts: ids }) });
    },
    [editable, dataset.id],
  );
  const events = useMemo(() => applyFilter(dataset, filter), [dataset, filter]);
  const range = useMemo(() => rangeOf(dataset, filter), [dataset, filter]);
  const span = range[1] - range[0];

  const [period, setPeriod] = useState<Period>(() => defaultPeriod(span, events.length));
  // The time window is the region the map shows.
  // Open on the middle half of the story.
  const [rawWin, setWinRaw] = useState<[number, number]>(() => halfWindow(range, events));
  const setWin = useCallback((w: [number, number]) => setWinRaw(w), []);
  const win = useMemo<[number, number]>(() => {
    const MINW = 60000;
    const w = Math.min(Math.max(rawWin[1] - rawWin[0], MINW), span * 1.2 + MINW);
    let from = rawWin[0];
    if (from + w < range[0] + MINW) from = range[0] + MINW - w;
    if (from > range[1] - MINW) from = range[1] - MINW;
    return [from, from + w];
  }, [rawWin, range, span]);
  const [pFrom, pTo] = win;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Set<string> | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(() => dataset.summary.bbox);
  const [boundsKey, setBoundsKey] = useState(0);
  const [panel, setPanel] = useState<"chat" | "look" | "stories" | "sources">(studio ? "sources" : "chat");
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
  // The camera right now, and the saving of it as the story's default view.
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [viewSaving, setViewSaving] = useState(false);
  const [viewSavedAt, setViewSavedAt] = useState<string | null>(null);
  const saveView = async () => {
    if (!studio || !dataset.id || !camera || viewSaving) return;
    setViewSaving(true);
    try {
      const res = await fetch(`/api/datasets/${dataset.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ view: camera }) });
      if (res.ok) {
        setViewSavedAt(new Date().toISOString());
        setDataset((d) => ({ ...d, view: camera }));
      }
    } finally {
      setViewSaving(false);
    }
  };
  const theme = useMemo(() => themeById(themeId), [themeId]);
  const mapStyle = useMemo(() => buildStyle(theme), [theme]);

  // The camera is the viewer's: moving the time window never pans or zooms
  // the map. The region in view, together with the window, is what the
  // intelligence is about; the map reports its bounds after every move.
  const [viewBounds, setViewBounds] = useState<[number, number, number, number] | null>(null);

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
      // Show everything in the focused range at once: one window over it.
      setWin([r[0], r[1]]);
      if (focusList.length === 1) setSelectedId(focusList[0].id);
    },
    [dataset, setWin],
  );

  const reset = () => {
    setFilter(EMPTY_FILTER);
    setHighlight(null);
    setCaption(null);
    setSelectedId(null);
    const tMin = dataset.summary.tMin ?? 0;
    const np = defaultPeriod((dataset.summary.tMax ?? tMin) - tMin, dataset.events.length);
    setPeriod(np);
    setBounds(dataset.summary.bbox);
    setBoundsKey((k) => k + 1);
    setWin(halfWindow([tMin, dataset.summary.tMax ?? tMin + 1], dataset.events));
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
  const tabs: { id: "sources" | "look" | "stories" | "chat"; label: string }[] = [
    ...(studio ? [{ id: "sources" as const, label: "General" }] : []),
    ...(studio ? [{ id: "look" as const, label: `Appearance${dirty ? " •" : ""}` }] : []),
    ...(studio ? [{ id: "stories" as const, label: "Stories" }] : []),
    ...(!isNew ? [{ id: "chat" as const, label: "Intelligence" }] : []),
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
      {/* The side panel overlays the map, so MapLibre's controls shift left of it. */}
      <div className="absolute inset-0" style={{ "--ctrl-right": panelOpen && wide ? "412px" : "0px" } as React.CSSProperties}>
        <MapView
          events={events}
          color={markerColor}
          cursor={pTo}
          insetLeft={wide && selected ? 380 : 0}
          insetRight={wide && panelOpen ? 412 : 0}
          insetBottom={hasEvents ? timelineH + 12 : 0}
          from={pFrom}
          to={pTo}
          highlight={highlight}
          selectedId={selectedId}
          bounds={bounds}
          boundsKey={boundsKey}
          mapStyle={mapStyle}
          marker={marker}
          onSelect={setSelectedId}
          onViewBounds={setViewBounds}
          onCamera={setCamera}
          defaultView={dataset.view ?? null}
          viewKey={dataset.id || undefined}
        />
        <LookOverlay theme={theme} />
      </div>

      {/* Top bar: one fixed bar. Name in the center switches between stories;
          actions on the right collapse into a menu on small screens. */}
      <header className="absolute inset-x-0 top-0 z-30 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-line bg-ink/85 px-3 backdrop-blur md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start text-lg font-semibold tracking-[0.14em] hover:text-glow">
          <Logo size={40} /> <span className="hidden sm:inline">AIGIS</span>
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
                <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-dim">Your stories</div>
                {library.length === 0 && <div className="px-2.5 py-2 text-xs text-dim">No stories yet. Upload sources to create one.</div>}
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
                    <span className="text-base leading-none">+</span> New story
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
          <span className="ml-2">
            <AccountMenu user={user} compact />
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
            <AccountMenu user={user} compact />
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
                className={`-mb-px flex-1 border-b-2 px-3 py-2.5 text-center text-sm outline-none transition focus:outline-none focus-visible:outline-none ${panel === t.id ? "border-glow text-fog" : "border-transparent text-mist hover:text-fog"}`}
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
              <ChatPanel dataset={dataset} window={win} viewBounds={viewBounds} filter={filter} contexts={contexts} onContexts={setEnabledContexts} suggestions={suggestions} onFocus={focus} handleRef={chatRef} inputHeight={wide ? timelineH : 0} />
            </div>
          )}
          {(panel === "sources" || panel === "stories") && studio && (
            <SourcesPanel view={panel === "stories" ? "stories" : "general"} dataset={dataset} isNew={isNew} editable={editable} themeId={themeId} library={library} onChanged={setDataset} />
          )}
          {panel === "look" && studio && (
            <DesignPanel
              marker={marker}
              onMarker={setMarker}
              themeId={themeId}
              dirty={dirty}
              saving={saving}
              savedAt={savedAt}
              onTheme={setThemeId}
              onSave={save}
              onSaveView={saveView}
              viewSaving={viewSaving}
              viewSavedAt={viewSavedAt}
              hasDefaultView={Boolean(dataset.view)}
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
          period={period}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onWindow={setWin}
          onPeriod={setPeriod}
        />
      </div>
      )}
      {isNew && !panelOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 text-center text-sm text-mist">Open Sources from the menu to drop the files for this story.</div>
      )}
    </div>
  );
}

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}



"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_MARKER, type Dataset, type GeoEvent, type Insight, type MarkerStyle } from "@/lib/types";
import { DAY, STORY, storyTime } from "@/lib/story";
import type { FocusMapInputT } from "@/lib/ai/tools";
import { applyFilter, bboxOf, EMPTY_FILTER, openingWindow, rangeOf, type Filter } from "./explorer-state";
import { defaultPeriod, periodBounds, type Period } from "@/lib/period";
import { fmtDate } from "@/lib/format";
import { MapView } from "./MapView";
import { Timeline } from "./Timeline";
import { DetailPanel } from "./DetailPanel";
import { ChatPanel, type ChatHandle } from "./ChatPanel";
import { DesignPanel } from "./DesignPanel";
import { SourcesPanel, type LibraryItem } from "./SourcesPanel";
import { Logo } from "@/components/Logo";
import { buildStyle, isDarkTheme, themeById, type Theme } from "@/lib/map/styles";
import { LookOverlay } from "./LookOverlay";
import { useClickOutside } from "@/lib/use-click-outside";
import { AccountMenu, type SessionUser } from "./AccountMenu";


// Camera frames for playback. The story plays inside one frame that holds
// every stop in the window; the camera only dives when the last few stops
// sit close together (a city's worth of photos), and climbs back out when
// the story leaves that region.
function spanBounds(stops: GeoEvent[]): [number, number, number, number] {
  const minSpan = 0.25; // degrees, about 25 km
  const lats = stops.map((e) => e.lat);
  const lngs = stops.map((e) => e.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const cLat = (minLat + maxLat) / 2;
  const cLng = (minLng + maxLng) / 2;
  const hLat = Math.max((maxLat - minLat) * 0.75, minSpan * 0.6) / 2 + (maxLat - minLat) * 0.125;
  const hLng = Math.max((maxLng - minLng) * 0.75, minSpan) / 2 + (maxLng - minLng) * 0.125;
  return [cLng - hLng, Math.max(-85, cLat - hLat), cLng + hLng, Math.min(85, cLat + hLat)];
}

// What to call a stop: the city, read as the segment before the country in
// each member's place string; a cluster takes its commonest city and is
// marked as a region.
function cityOf(place: string): string {
  const segs = place.split(",").map((x) => x.trim()).filter(Boolean);
  return segs.length >= 2 ? segs[segs.length - 2] : segs[0] ?? "";
}
function stopLabel(stop: StoryStop): string {
  const tally = new Map<string, number>();
  for (const e of stop.members) {
    const c = cityOf(e.place);
    tally.set(c, (tally.get(c) ?? 0) + 1);
  }
  const city = [...tally.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? stop.rep.place;
  return stop.members.length > 1 ? `${city} Region` : city;
}

// How many countries the story touches, read from the last segment of each
// place string. A story that never leaves one country has nothing to play.
const COUNTRY_ALIAS: Record<string, string> = {
  "usa": "united states", "us": "united states", "u.s.": "united states", "u.s.a.": "united states", "united states of america": "united states",
  "uk": "united kingdom", "u.k.": "united kingdom", "england": "united kingdom", "scotland": "united kingdom", "wales": "united kingdom", "northern ireland": "united kingdom", "great britain": "united kingdom",
  "czech republic": "czechia", "holland": "netherlands", "the netherlands": "netherlands",
};
function countryCount(list: GeoEvent[]): number {
  const seen = new Set<string>();
  for (const e of list) {
    const parts = e.place.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) continue;
    const last = parts[parts.length - 1];
    seen.add(COUNTRY_ALIAS[last] ?? last);
  }
  return seen.size;
}

// The play list: one stop per cluster. Events that follow each other within
// a city's reach (half a degree, about 50 km) collapse into one stop,
// represented by the first event that has a picture. The stop's time is the
// cluster's last event, so every marker in the cluster appears on arrival.
export type StoryStop = { rep: GeoEvent; at: number; members: GeoEvent[] };
function storyStops(list: GeoEvent[]): StoryStop[] {
  const sorted = [...list].sort((x, y) => storyTime(x) - storyTime(y));
  // A date-only row (a ledger line on a city centroid) adds nothing when a
  // timed event of the same day already took the story to that city.
  const timed = sorted.filter((e) => e.t % DAY !== 0);
  const redundant = (e: GeoEvent) => e.t % DAY === 0 && timed.some((o) => Math.floor(o.t / DAY) === Math.floor(e.t / DAY) && Math.abs(o.lat - e.lat) < 0.3 && Math.abs(o.lng - e.lng) < 0.3);
  const reach = 0.5;
  const out: StoryStop[] = [];
  for (const e of sorted) {
    if (redundant(e)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last.members[0].lat - e.lat) < reach && Math.abs(last.members[0].lng - e.lng) < reach) {
      last.members.push(e);
      last.at = Math.max(last.at, storyTime(e));
      if (!last.rep.media && e.media) last.rep = e;
      continue;
    }
    out.push({ rep: e, at: storyTime(e), members: [e] });
  }
  return out;
}

export function Explorer({
  dataset: initial,
  suggestions,
  defaultTheme,
  mode,
  editable,
  user = null,
  library = [],
  looks: initialLooks = [],
}: {
  dataset: Dataset;
  suggestions: string[];
  defaultTheme: string;
  mode: "studio" | "view";
  editable: boolean;
  user?: SessionUser;
  library?: LibraryItem[];
  // Looks designed in Studio, alongside the built-ins.
  looks?: Theme[];
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
  const events = useMemo(() => applyFilter(dataset, filter), [dataset, filter]);
  const range = useMemo(() => rangeOf(dataset, filter), [dataset, filter]);
  const span = range[1] - range[0];

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [period, setPeriod] = useState<Period>(() => defaultPeriod(span, events.length));
  // Playback is only offered for stories that cross a border.
  const travels = useMemo(() => countryCount(events) > 1, [events]);
  // The time window is the region the map shows.
  // Start in the middle of the story rather than at its first event, on a
  // window wide enough to show at least twenty events.
  const [rawWin, setWinRaw] = useState<[number, number]>(() => openingWindow(events, range[0] + span / 2, defaultPeriod(span, events.length)));
  // Story playback: play walks through the events inside the window one at
  // a time. storyCursor is the time of the event the story has reached;
  // null when the window is being used as a plain time filter.
  const [storyCursor, setStoryCursor] = useState<number | null>(null);
  // The stops the story has reached so far (one marker per cluster) and the
  // cursor before the latest step; markers newer than that stay hidden
  // until the hop arrives.
  const [storyPath, setStoryPath] = useState<GeoEvent[]>([]);
  const [revealAfter, setRevealAfter] = useState(-Infinity);
  const [storyLabel, setStoryLabel] = useState<string | null>(null);
  const storyPos = useRef(-1);
  const setWin = useCallback((w: [number, number]) => {
    setWinRaw(w);
    setStoryCursor(null);
    setStoryPath([]);
    setRevealAfter(-Infinity);
    setStoryLabel(null);
    storyPos.current = -1;
  }, []);
  const win = useMemo<[number, number]>(() => {
    const MINW = 60000;
    const w = Math.min(Math.max(rawWin[1] - rawWin[0], MINW), span * 1.2 + MINW);
    let from = rawWin[0];
    if (from + w < range[0] + MINW) from = range[0] + MINW - w;
    if (from > range[1] - MINW) from = range[1] - MINW;
    return [from, from + w];
  }, [rawWin, range, span]);
  const [pFrom, pTo] = win;
  const cursor = storyCursor ?? pTo;
  // The camera always follows: it re-frames on whatever the time window shows.
  const [followBounds, setFollowBounds] = useState<[number, number, number, number] | null>(null);
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
  const [looks, setLooks] = useState<Theme[]>(initialLooks);
  const theme = useMemo(() => themeById(themeId, looks), [themeId, looks]);
  const mapStyle = useMemo(() => buildStyle(theme), [theme]);

  const winRef = useRef(win);
  useEffect(() => {
    winRef.current = win;
  }, [win]);
  // Story playback: every stop inside the highlighted window, first to last.
  // The camera is set once to hold all of them and never moves during play.
  // Each step: let the line grow to the stop, hold. Nothing opens.
  useEffect(() => {
    if (!playing) return;
    const [a, b] = winRef.current;
    const inWin = events.filter((e) => e.t >= a && e.t <= b);
    const seq = storyStops(inWin);
    if (!seq.length) return;
    const whole = spanBounds(inWin);
    const frame = (bb: [number, number, number, number]) => setFollowBounds((old) => (old && old.every((v, k) => v === bb[k]) ? old : bb));
    let i = storyPos.current + 1 < seq.length ? storyPos.current + 1 : 0;
    let timer = 0;
    let canceled = false;
    const step = () => {
      if (canceled) return;
      if (i >= seq.length) {
        storyPos.current = -1;
        setPlaying(false);
        return;
      }
      const stop = seq[i];
      const first = i === 0;
      storyPos.current = i;
      i++;
      frame(whole);
      setRevealAfter(first ? -Infinity : seq[i - 2].at);
      setStoryPath(seq.slice(0, i).map((x) => x.rep));
      setStoryCursor(stop.at);
      setStoryLabel(stopLabel(stop));
      timer = window.setTimeout(step, ((first ? 0 : STORY.frame + STORY.draw) + STORY.hold) / speed);
    };
    step();
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [playing, speed, events]);

  // Events the map is showing right now; the camera re-frames only when this set changes.
  const visible = useMemo(() => events.filter((e) => e.t <= cursor && (e.tEnd ?? e.t) >= pFrom), [events, pFrom, cursor]);
  const visibleKey = useMemo(() => visible.map((e) => e.id).join(","), [visible]);
  // Not while a story is playing or has finished: that frame holds until the
  // window is moved by hand.
  const storyActive = playing || storyCursor !== null;
  useEffect(() => {
    if (storyActive) return;
    const h = setTimeout(() => {
      const bb = bboxOf(visible);
      if (bb) setFollowBounds((prev) => (prev && prev.every((v, i) => v === bb[i]) ? prev : bb));
    }, 160);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, storyActive]);

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
        setPeriod(np);
        setWin(periodBounds(r[0], np));
        setPlaying(true);
      } else {
        // Show everything in the focused range at once: one window over it.
        setPlaying(false);
        setWin([r[0], r[1]]);
      }
      if (focusList.length === 1) setSelectedId(focusList[0].id);
    },
    [dataset, setWin],
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
    const tMin = dataset.summary.tMin ?? 0;
    const np = defaultPeriod((dataset.summary.tMax ?? tMin) - tMin, dataset.events.length);
    setPeriod(np);
    setBounds(dataset.summary.bbox);
    setBoundsKey((k) => k + 1);
    setWin(openingWindow(dataset.events, tMin, np));
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
  const tabs: { id: "sources" | "look" | "stories" | "chat"; label: string }[] = [
    ...(studio ? [{ id: "sources" as const, label: "General" }] : []),
    ...(studio ? [{ id: "look" as const, label: `Appearance${dirty ? " •" : ""}` }] : []),
    ...(studio ? [{ id: "stories" as const, label: "Stories" }] : []),
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
      {/* The side panel overlays the map, so MapLibre's controls shift left of it. */}
      <div className="absolute inset-0" style={{ "--ctrl-right": panelOpen && wide ? "412px" : "0px" } as React.CSSProperties}>
        <MapView
          events={events}
          color={markerColor}
          cursor={cursor}
          story={storyCursor !== null}
          storyPath={storyPath}
          revealAfter={revealAfter}
          speed={speed}
          insetLeft={wide && selected ? 380 : 0}
          insetRight={wide && panelOpen ? 412 : 0}
          insetBottom={hasEvents ? timelineH + 12 : 0}
          from={pFrom}
          to={pTo}
          highlight={highlight}
          selectedId={selectedId}
          bounds={bounds}
          boundsKey={boundsKey}
          followBounds={followBounds}
          mapStyle={mapStyle}
          marker={marker}
          onSelect={setSelectedId}
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
              <ChatPanel datasetId={dataset.id} suggestions={suggestions} insights={dataset.insights ?? []} onPickInsight={pickInsight} onFocus={focus} handleRef={chatRef} inputHeight={wide ? timelineH : 0} />
            </div>
          )}
          {(panel === "sources" || panel === "stories") && studio && (
            <SourcesPanel view={panel === "stories" ? "stories" : "general"} dataset={dataset} isNew={isNew} editable={editable} themeId={themeId} library={library} onChanged={setDataset} />
          )}
          {panel === "look" && studio && (
            <DesignPanel
              looks={looks}
              onLooks={setLooks}
              marker={marker}
              onMarker={setMarker}
              themeId={themeId}
              dirty={dirty}
              saving={saving}
              savedAt={savedAt}
              onTheme={setThemeId}
              onSave={save}
            />
          )}
        </div>
      </aside>

      {/* Story caption: where the story is right now. */}
      {storyLabel && storyCursor !== null && (
        <div
          key={storyLabel + storyCursor}
          className={`story-caption pointer-events-none absolute left-3 right-3 z-30 flex justify-center ${panelOpen ? "hidden md:flex md:right-[412px]" : ""}`}
          style={{ bottom: timelineH + 28 }}
        >
          <div className="rounded-full border border-line bg-ink/85 px-6 py-2.5 text-center shadow-2xl backdrop-blur">
            <div className="text-lg font-semibold text-fog md:text-xl">{storyLabel}</div>
            <div className="font-mono text-xs text-mist">{fmtDate(storyCursor, span)}</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {hasEvents && (
      <div ref={timelineRef} className={`pointer-events-none absolute bottom-3 left-3 right-3 z-30 transition-all ${panelOpen ? "hidden md:block md:right-[412px]" : ""}`}>
        <Timeline
          events={events}
          color={markerColor}
          range={range}
          window={win}
          playing={playing}
          playable={travels}
          speed={speed}
          period={period}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onWindow={setWin}
          onPlay={setPlaying}
          onSpeed={setSpeed}
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



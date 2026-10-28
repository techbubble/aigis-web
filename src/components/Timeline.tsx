"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoEvent } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { PERIODS, periodBounds, periodLabel, periodsInSpan, type Period } from "@/lib/period";
import { useClickOutside } from "@/lib/use-click-outside";

// Two-band timeline in the spirit of SIMILE Exhibit/Timeline. The time window
// is the region the map shows: slide it to scrub, resize it to widen or narrow
// the period, press play to let it travel across the range. The detail band is
// a magnified view of the window with dimmed context either side; the overview
// band shows the whole range with the window as a draggable, resizable handle.

const MIN = 60000,
  HOUR = 3600000,
  DAY = 86400000,
  MONTH = 30.4375 * DAY,
  YEAR = 365.25 * DAY;
const DETAIL_H = 92;
const OVERVIEW_H = 34;
const HANDLE_W = 7;

type Props = {
  events: GeoEvent[];
  color: string;
  range: [number, number];
  window: [number, number];
  playing: boolean;
  speed: number;
  period: Period;
  cumulative: boolean;
  selectedId: string | null;
  onWindow: (w: [number, number]) => void;
  onPlay: (p: boolean) => void;
  onSpeed: (s: number) => void;
  onPeriod: (p: Period) => void;
  onCumulative: (c: boolean) => void;
  onSelect: (id: string) => void;
};

export function Timeline(p: Props) {
  const { events, color, range, window: win, playing, period, cumulative } = p;
  const [wFrom, wTo] = win;
  const wWidth = Math.max(MIN, wTo - wFrom);
  const span = Math.max(1, range[1] - range[0]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const detRef = useRef<SVGSVGElement>(null);
  const ovRef = useRef<SVGSVGElement>(null);
  // Pointer x relative to a band, independent of which SVG child is under the pointer.
  const px = (e: { clientX: number }, ref: React.RefObject<SVGSVGElement | null>) => e.clientX - (ref.current?.getBoundingClientRect().left ?? 0);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [ovHover, setOvHover] = useState<"edge" | "inside" | "outside" | null>(null);
  const [ovDragging, setOvDragging] = useState<"move" | "resize" | false>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useClickOutside(settingsRef, settingsOpen, () => setSettingsOpen(false));

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Detail band extent: the window plus context on each side. In cumulative
  // mode the band shows the whole range so the growing region stays visible.
  const view = useMemo<[number, number]>(() => {
    if (cumulative) return [range[0] - span * 0.02, range[1] + span * 0.02];
    return [wFrom - wWidth * 0.75, wTo + wWidth * 0.75];
  }, [cumulative, range, span, wFrom, wTo, wWidth]);
  const vspan = Math.max(MIN, view[1] - view[0]);
  const xOf = useCallback((t: number) => ((t - view[0]) / vspan) * width, [view, vspan, width]);
  const tOf = useCallback((x: number) => view[0] + (x / width) * vspan, [view, vspan, width]);

  const setWindow = useCallback(
    (a: number, b: number) => {
      if (cumulative) {
        p.onWindow([range[0], Math.min(range[1], Math.max(range[0] + MIN, b))]);
        return;
      }
      const w = Math.min(Math.max(b - a, MIN), span * 1.2);
      let from = a;
      if (from + w < range[0] + MIN) from = range[0] + MIN - w;
      if (from > range[1] - MIN) from = range[1] - MIN;
      p.onWindow([from, from + w]);
    },
    [cumulative, p, range, span],
  );

  // Ticks
  const ticks = useMemo(() => {
    const target = Math.max(1, Math.floor(width / 110));
    const steps = [MIN, 5 * MIN, 15 * MIN, HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 7 * DAY, 14 * DAY, MONTH, 3 * MONTH, 6 * MONTH, YEAR, 2 * YEAR, 5 * YEAR, 10 * YEAR, 25 * YEAR, 50 * YEAR, 100 * YEAR];
    const step = steps.find((s) => vspan / s <= target) ?? 100 * YEAR;
    const out: { t: number; label: string; major: boolean }[] = [];
    const start = floorTo(view[0], step);
    for (let t = start; t <= view[1] + step; t = nextTick(t, step)) {
      if (t < view[0] - step) continue;
      out.push({ t, label: tickLabel(t, step), major: isMajor(t, step) });
      if (out.length > 400) break;
    }
    return out;
  }, [view, vspan, width]);

  const snapped = !cumulative ? (PERIODS.find((pp) => isPeriod(win, pp)) ?? null) : null;
  const inWindow = useCallback((e: GeoEvent) => (cumulative ? e.t <= wTo : e.t < wTo && (e.tEnd ?? e.t) >= wFrom), [cumulative, wFrom, wTo]);

  // Events in view, laid out in lanes when sparse, histogram when dense
  const inView = useMemo(() => events.filter((e) => e.t >= view[0] - vspan * 0.1 && e.t <= view[1] + vspan * 0.1), [events, view, vspan]);
  const sparse = inView.length <= 160;
  const lanes = useMemo(() => {
    if (!sparse) return [];
    const sorted = [...inView].sort((a, b) => a.t - b.t);
    const laneEnd: number[] = [];
    return sorted.map((e) => {
      const x = xOf(e.t);
      const w = Math.min(150, 14 + e.title.length * 5.6);
      let lane = laneEnd.findIndex((end) => end < x - 4);
      if (lane === -1) {
        if (laneEnd.length < 4) {
          lane = laneEnd.length;
          laneEnd.push(0);
        } else lane = -1;
      }
      if (lane >= 0) laneEnd[lane] = x + w;
      return { e, x, lane, w };
    });
  }, [inView, sparse, xOf]);
  const bars = useMemo(() => {
    if (sparse) return [];
    const bw = 4;
    const n = Math.ceil(width / bw);
    const counts = new Array<number>(n).fill(0);
    for (const e of inView) {
      const i = Math.floor(xOf(e.t) / bw);
      if (i < 0 || i >= n) continue;
      counts[i]++;
    }
    const max = Math.max(1, ...counts);
    return counts.map((c, i) => ({ x: i * bw, h: c / max, n: c }));
  }, [inView, sparse, width, xOf]);

  // Overview density
  const ov = useMemo(() => {
    const N = 160;
    const counts = new Array<number>(N).fill(0);
    for (const e of events) {
      const i = Math.min(N - 1, Math.max(0, Math.floor(((e.t - range[0]) / span) * N)));
      counts[i]++;
    }
    const max = Math.max(1, ...counts);
    return counts.map((c) => c / max);
  }, [events, range, span]);

  // Detail band: drag slides the window, click centres it, wheel resizes it.
  const drag = useRef<{ x0: number; w0: [number, number]; moved: boolean; snap: Period | null } | null>(null);
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    detRef.current?.setPointerCapture?.(e.pointerId);
    drag.current = { x0: px(e, detRef), w0: win, moved: false, snap: snapped };
    setDragging(true);
    p.onPlay(false);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const x = px(e, detRef);
    setHover({ x, t: tOf(x) });
    const d = drag.current;
    if (!d) return;
    const dx = x - d.x0;
    if (Math.abs(dx) > 3) d.moved = true;
    if (!d.moved) return;
    const dt = (dx / width) * vspan;
    if (cumulative) setWindow(range[0], d.w0[1] - dt);
    else setWindow(d.w0[0] - dt, d.w0[1] - dt);
  };
  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.moved) {
      if (d.snap) {
        const [a, b] = periodBounds(wFrom + wWidth / 2, d.snap);
        setWindow(a, b);
      }
      return;
    }
    const t = tOf(px(e, detRef));
    if (cumulative) setWindow(range[0], t);
    else if (d.snap) {
      const [a, b] = periodBounds(t, d.snap);
      setWindow(a, b);
    } else setWindow(t - wWidth / 2, t + wWidth / 2);
  };
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const x = px(e, detRef);
    const t = tOf(x);
    if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      const k = Math.exp(e.deltaY * 0.0015);
      if (cumulative) setWindow(range[0], wFrom + (wTo - wFrom) * k);
      else setWindow(t - (t - wFrom) * k, t + (wTo - t) * k);
    } else {
      const dt = (e.deltaX / width) * vspan;
      if (cumulative) setWindow(range[0], wTo + dt);
      else setWindow(wFrom + dt, wTo + dt);
    }
  };
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const prevent = (ev: WheelEvent) => ev.preventDefault();
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, []);

  // Overview: drag the window to scrub, drag its edges to resize, click outside to jump.
  const ovDrag = useRef<{ x0: number; w0: [number, number]; mode: "move" | "left" | "right"; snap: Period | null } | null>(null);
  const ovX = (t: number) => ((t - range[0]) / span) * width;
  const ovT = (x: number) => range[0] + (x / width) * span;
  const ovZone = (x: number): "left" | "right" | "inside" | "outside" => {
    const a = ovX(wFrom),
      b = ovX(wTo);
    if (!cumulative && Math.abs(x - a) <= HANDLE_W + 2) return "left";
    if (Math.abs(x - b) <= HANDLE_W + 2) return "right";
    return x > a && x < b ? "inside" : "outside";
  };
  const onOvDown = (e: React.PointerEvent<SVGSVGElement>) => {
    ovRef.current?.setPointerCapture?.(e.pointerId);
    const x = px(e, ovRef);
    const zone = ovZone(x);
    p.onPlay(false);
    if (zone === "left" || zone === "right") {
      ovDrag.current = { x0: x, w0: win, mode: zone, snap: null };
      setOvDragging("resize");
      return;
    }
    if (zone === "outside") {
      const t = ovT(x);
      const w0: [number, number] = cumulative ? [range[0], t] : [t - wWidth / 2, t + wWidth / 2];
      setWindow(w0[0], w0[1]);
      ovDrag.current = { x0: x, w0, mode: "move", snap: snapped };
      setOvDragging("move");
      return;
    }
    ovDrag.current = { x0: x, w0: win, mode: "move", snap: snapped };
    setOvDragging("move");
  };
  const onOvMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const x = px(e, ovRef);
    const d = ovDrag.current;
    if (!d) {
      const z = ovZone(x);
      setOvHover(z === "left" || z === "right" ? "edge" : z);
      return;
    }
    const dt = ((x - d.x0) / width) * span;
    if (d.mode === "move") {
      if (cumulative) setWindow(range[0], d.w0[1] + dt);
      else setWindow(d.w0[0] + dt, d.w0[1] + dt);
    } else if (d.mode === "left") setWindow(Math.min(d.w0[0] + dt, d.w0[1] - MIN), d.w0[1]);
    else setWindow(d.w0[0], Math.max(d.w0[1] + dt, d.w0[0] + MIN));
  };
  const onOvUp = () => {
    const d = ovDrag.current;
    ovDrag.current = null;
    setOvDragging(false);
    if (d?.snap && !cumulative) {
      const [a, b] = periodBounds(wFrom + wWidth / 2, d.snap);
      setWindow(a, b);
    }
  };
  const ovCursor = ovDragging ? (ovDragging === "move" ? "cursor-grabbing" : "cursor-ew-resize") : ovHover === "edge" ? "cursor-ew-resize" : ovHover === "inside" ? "cursor-grab" : "cursor-pointer";

  const periods = periodsInSpan(span);
  const step = (dir: 1 | -1) => {
    p.onPlay(false);
    if (cumulative) {
      setWindow(range[0], wTo + dir * Math.max(MIN, (range[1] - range[0]) / 50));
      return;
    }
    if (snapped) {
      const [a, b] = periodBounds(dir > 0 ? wTo + 1 : wFrom - 1, snapped);
      setWindow(a, b);
    } else setWindow(wFrom + dir * wWidth, wTo + dir * wWidth);
  };
  const label = cumulative ? `Through ${fmtDate(wTo, span)}` : snapped ? periodLabel(wFrom, snapped) : `${fmtDate(wFrom, wWidth)} – ${fmtDate(wTo, wWidth)}`;

  const winX0 = Math.max(0, xOf(cumulative ? range[0] : wFrom));
  const winX1 = Math.min(width, xOf(wTo));

  return (
    <div className="pointer-events-auto rounded-xl border border-line bg-ink/85 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3 px-4 pt-3">
        <button onClick={() => p.onPlay(!playing)} className="flex h-9 w-9 items-center justify-center rounded-full bg-fog text-ink hover:opacity-85" aria-label={playing ? "Pause" : "Play"}>
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" />
              <rect x="8.5" y="1" width="3.5" height="12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1l10 6-10 6z" />
            </svg>
          )}
        </button>
        <button onClick={() => step(-1)} className="text-mist hover:text-fog" title="Previous period" aria-label="Previous period">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M10 1L3 7l7 6z" />
          </svg>
        </button>
        <button onClick={() => step(1)} className="text-mist hover:text-fog" title="Next period" aria-label="Next period">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M4 1l7 6-7 6z" />
          </svg>
        </button>
        <button
          onClick={() => {
            p.onPlay(false);
            if (cumulative) setWindow(range[0], range[0] + MIN);
            else {
              const [a, b] = periodBounds(range[0], period);
              setWindow(a, b);
            }
          }}
          className="text-mist hover:text-fog"
          title="Restart"
          aria-label="Restart"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="1" y="1" width="2" height="12" />
            <path d="M12 1L4 7l8 6z" />
          </svg>
        </button>
        <button
          onClick={() => {
            p.onPlay(false);
            setWindow(range[0], range[1] + MIN);
          }}
          className="text-mist hover:text-fog"
          title="Show the whole range"
          aria-label="Show the whole range"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M1 7h12M1 7l3-3M1 7l3 3M13 7l-3-3M13 7l-3 3" />
          </svg>
        </button>
        <div className="ml-2 whitespace-nowrap font-mono text-base tabular-nums text-fog xl:text-lg">{label}</div>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="mr-1 whitespace-nowrap text-dim">Show by</span>
          {periods.map((pp) => (
            <Chip
              key={pp}
              active={snapped === pp}
              onClick={() => {
                p.onPlay(false);
                p.onCumulative(false);
                p.onPeriod(pp);
                const [a, b] = periodBounds(cumulative ? wTo : wFrom + wWidth / 2, pp);
                p.onWindow([a, b]);
              }}
            >
              {pp}
            </Chip>
          ))}

          <div ref={settingsRef} className="relative ml-2">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono ${settingsOpen ? "bg-ink-3 text-fog" : "text-mist hover:bg-ink-3 hover:text-fog"}`}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              title="Playback speed"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="2.2" />
                <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
              </svg>
              {p.speed}x
            </button>
            {settingsOpen && (
              <>
                <div role="menu" className="absolute bottom-full right-0 z-40 mb-2 w-52 rounded-xl border border-line bg-ink/95 p-1.5 text-xs shadow-2xl backdrop-blur">
                  <div className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-dim">Speed</div>
                  {[0.5, 1, 2, 4].map((sp) => (
                    <button
                      key={sp}
                      role="menuitemradio"
                      aria-checked={p.speed === sp}
                      onClick={() => p.onSpeed(sp)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 font-mono ${p.speed === sp ? "bg-ink-3 text-fog" : "text-mist hover:bg-ink-3 hover:text-fog"}`}
                    >
                      {sp}x{p.speed === sp && <span className="text-glow">&#10003;</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="relative mt-2 select-none px-0">
        {/* Detail band */}
        <svg ref={detRef} width={width} height={DETAIL_H} className={`block touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setHover(null)} onWheel={onWheel}>
          <defs>
            <linearGradient id="tl-win" x1="0" x2="1">
              <stop offset="0" stopColor="var(--fog)" stopOpacity="0.03" />
              <stop offset="1" stopColor="var(--fog)" stopOpacity="0.14" />
            </linearGradient>
          </defs>
          {/* the window */}
          <rect x={winX0} y={0} width={Math.max(0, winX1 - winX0)} height={DETAIL_H - 18} fill={cumulative ? "url(#tl-win)" : "var(--fog)"} fillOpacity={cumulative ? 1 : 0.1} />
          <line x1={winX0} x2={winX0} y1={0} y2={DETAIL_H - 18} stroke="var(--fog)" strokeOpacity={0.45} />
          <line x1={winX1} x2={winX1} y1={0} y2={DETAIL_H - 18} stroke="var(--fog)" strokeOpacity={0.45} />
          {/* out-of-range shading */}
          <rect x={0} y={0} width={Math.max(0, xOf(range[0]))} height={DETAIL_H} fill="var(--ink)" opacity={0.55} />
          <rect x={Math.min(width, xOf(range[1]))} y={0} width={Math.max(0, width - xOf(range[1]))} height={DETAIL_H} fill="var(--ink)" opacity={0.55} />
          {/* ticks */}
          {ticks.map((tk) => {
            const x = xOf(tk.t);
            return (
              <g key={tk.t}>
                <line x1={x} x2={x} y1={0} y2={DETAIL_H - 18} stroke="var(--fog)" strokeOpacity={tk.major ? 0.14 : 0.06} />
                <text x={x + 4} y={DETAIL_H - 6} fill={tk.major ? "var(--mist)" : "var(--dim)"} fontSize={10} fontFamily="var(--font-geist-mono)">
                  {tk.label}
                </text>
              </g>
            );
          })}
          {/* events */}
          {sparse
            ? lanes.map(({ e, x, lane }) => {
                const on = inWindow(e);
                const y = DETAIL_H - 24;
                const ly = 12 + lane * 15;
                const sel = e.id === p.selectedId;
                return (
                  <g
                    key={e.id}
                    onClick={() => {
                      if (!drag.current?.moved) p.onSelect(e.id);
                    }}
                    className="cursor-pointer"
                    opacity={on ? 1 : 0.35}
                  >
                    <line x1={x} x2={x} y1={ly + 4} y2={y} stroke={color} strokeOpacity={0.35} />
                    <circle cx={x} cy={y} r={sel ? 5 : 3.2} fill={color} stroke={sel ? "var(--fog)" : "none"} strokeWidth={1.5} />
                    {lane >= 0 && (
                      <text x={x + 5} y={ly + 2} fill={sel ? "var(--fog)" : "var(--mist)"} fontSize={10} fontFamily="var(--font-geist-sans)">
                        {e.title.length > 26 ? e.title.slice(0, 25) + "…" : e.title}
                      </text>
                    )}
                  </g>
                );
              })
            : bars.map((b, i) =>
                b.n ? <rect key={i} x={b.x} y={DETAIL_H - 20 - b.h * (DETAIL_H - 28)} width={3} height={b.h * (DETAIL_H - 28)} fill={color} opacity={b.x >= winX0 - 2 && b.x < winX1 ? 0.95 : 0.35} rx={1} /> : null,
              )}
          {/* hover */}
          {hover && !dragging && (
            <g pointerEvents="none">
              <line x1={hover.x} x2={hover.x} y1={0} y2={DETAIL_H - 18} stroke="var(--fog)" strokeOpacity={0.3} strokeDasharray="2 2" />
              <text x={hover.x + 4} y={10} fill="var(--fog)" fontSize={10} fontFamily="var(--font-geist-mono)">
                {fmtDate(hover.t, vspan)}
              </text>
            </g>
          )}
        </svg>

        {/* Overview band */}
        <svg ref={ovRef} width={width} height={OVERVIEW_H} className={`block touch-none border-t border-line ${ovCursor}`} onPointerDown={onOvDown} onPointerMove={onOvMove} onPointerUp={onOvUp} onPointerLeave={() => setOvHover(null)}>
          {ov.map((h, i) => (
            <rect key={i} x={(i / ov.length) * width} y={OVERVIEW_H - 3 - h * (OVERVIEW_H - 10)} width={Math.max(1, width / ov.length - 1)} height={h * (OVERVIEW_H - 10)} fill="var(--mist)" opacity={0.5} />
          ))}
          {(() => {
            const a = Math.max(0, ovX(cumulative ? range[0] : wFrom));
            const b = Math.min(width, ovX(wTo));
            const w = Math.max(HANDLE_W * 2 + 4, b - a);
            const hy = 5,
              hh = OVERVIEW_H - 10;
            return (
              <g>
                <rect x={0} y={0} width={a} height={OVERVIEW_H} fill="var(--ink)" opacity={0.6} />
                <rect x={a + w} y={0} width={Math.max(0, width - a - w)} height={OVERVIEW_H} fill="var(--ink)" opacity={0.6} />
                <rect x={a} y={2} width={w} height={OVERVIEW_H - 4} fill="var(--glow)" fillOpacity={0.12} stroke="var(--glow)" strokeOpacity={0.7} rx={4} />
                {!cumulative && <rect x={a - 1} y={hy} width={HANDLE_W} height={hh} rx={2} fill="var(--fog)" />}
                <rect x={a + w - HANDLE_W + 1} y={hy} width={HANDLE_W} height={hh} rx={2} fill="var(--fog)" />
                {!cumulative && <line x1={a + 2.5} x2={a + 2.5} y1={hy + 5} y2={hy + hh - 5} stroke="var(--ink)" strokeOpacity={0.6} />}
                <line x1={a + w - 2.5} x2={a + w - 2.5} y1={hy + 5} y2={hy + hh - 5} stroke="var(--ink)" strokeOpacity={0.6} />
              </g>
            );
          })()}
        </svg>
      </div>
      <div className="flex justify-between px-4 pb-2 pt-1 font-mono text-[10px] text-dim">
        <span>{fmtDate(range[0], span)}</span>
        <span>
          {events.length} events<span className="hidden sm:inline"> · drag to slide · wheel to widen or narrow</span> ·{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:text-mist hover:underline">
            &copy; OpenStreetMap contributors
          </a>{" "}
          ·{" "}
          <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className="hover:text-mist hover:underline">
            OpenFreeMap
          </a>
        </span>
        <span>{fmtDate(range[1], span)}</span>
      </div>
    </div>
  );
}

function isPeriod(w: [number, number], p: Period) {
  const [a, b] = periodBounds(w[0], p);
  return Math.abs(a - w[0]) < 1000 && Math.abs(b - w[1]) < 1000;
}


function Chip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={onClick} title={title} className={`whitespace-nowrap rounded px-1.5 py-0.5 font-mono ${active ? "bg-fog text-ink" : "text-mist hover:bg-ink-3 hover:text-fog"}`}>
      {children}
    </button>
  );
}

function floorTo(t: number, step: number) {
  const d = new Date(t);
  if (step >= YEAR) {
    const yrs = Math.round(step / YEAR);
    const y = Math.floor(d.getUTCFullYear() / yrs) * yrs;
    return Date.UTC(y, 0, 1);
  }
  if (step >= MONTH) {
    const m = Math.round(step / MONTH);
    return Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / m) * m, 1);
  }
  return Math.floor(t / step) * step;
}
function nextTick(t: number, step: number) {
  const d = new Date(t);
  if (step >= YEAR) return Date.UTC(d.getUTCFullYear() + Math.round(step / YEAR), 0, 1);
  if (step >= MONTH) return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.round(step / MONTH), 1);
  return t + step;
}
function isMajor(t: number, step: number) {
  const d = new Date(t);
  if (step >= YEAR) return d.getUTCFullYear() % (Math.round(step / YEAR) * 5) === 0;
  if (step >= MONTH) return d.getUTCMonth() === 0;
  if (step >= DAY) return d.getUTCDate() === 1;
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
}
function tickLabel(t: number, step: number) {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (step >= YEAR) return String(y);
  if (step >= MONTH) return d.getUTCMonth() === 0 ? `${mon} ${y}` : mon;
  if (step >= DAY) return d.getUTCDate() === 1 ? `${mon} ${d.getUTCDate()}` : `${d.getUTCDate()}`;
  const hh = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 ? `${mon} ${d.getUTCDate()}` : hh;
}


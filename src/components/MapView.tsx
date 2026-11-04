"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, NavigationControl, Source, useControl, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import maplibregl from "@/lib/map/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString, Point } from "geojson";
import type { GeoEvent, MarkerStyle } from "@/lib/types";
import { drawArrowIcon, drawMarkerIcon, drawVehicleIcon, SHAPE_IDS, shapeAnchor } from "@/lib/markers";
import { STORY, storyTime } from "@/lib/story";
import type { MarkerShape } from "@/lib/types";

const CLUSTER_MAX_ZOOM = 15;
const CLUSTER_RADIUS = 32;
const WORLD = 512;

// Web Mercator helpers (bearing 0, no pitch) so spider positions can be derived
// in render without touching the map instance.
function project(lng: number, lat: number, zoom: number): [number, number] {
  const size = WORLD * Math.pow(2, zoom);
  const phi = (lat * Math.PI) / 180;
  return [((lng + 180) / 360) * size, ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size];
}
function unproject(x: number, y: number, zoom: number): [number, number] {
  const size = WORLD * Math.pow(2, zoom);
  return [(x / size) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI];
}

// Pixel offsets for n legs: a ring for small counts, an Archimedean spiral beyond.
function spiderOffsets(n: number): [number, number][] {
  const out: [number, number][] = [];
  if (n <= 9) {
    const r = Math.max(36, (30 * (2 + n)) / (2 * Math.PI));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      out.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return out;
  }
  let leg = 18,
    angle = 0;
  for (let i = 0; i < n; i++) {
    angle += 30 / leg + i * 0.0005;
    out.push([leg * Math.cos(angle), leg * Math.sin(angle)]);
    leg += (2 * Math.PI * 6) / angle;
  }
  return out;
}

type Spider = { key: string; center: [number, number]; ids: string[]; clusterId: number };

function bboxOf(pts: [number, number][]): [number, number, number, number] {
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  for (const [x, y] of pts) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
}

// Lowest zoom at which no two points sit within the cluster radius of each other.
function separationZoom(pts: [number, number][], radius = CLUSTER_RADIUS): number {
  let z = 0;
  const px = pts.map(([lng, lat]) => project(lng, lat, 0));
  for (let i = 0; i < px.length; i++)
    for (let j = i + 1; j < px.length; j++) {
      const d = Math.hypot(px[i][0] - px[j][0], px[i][1] - px[j][1]);
      // d * 2^z >= radius
      z = Math.max(z, d > 0 ? Math.log2(radius / d) : Infinity);
    }
  return z;
}


export function MapView({
  events,
  color,
  cursor,
  story,
  storyPath,
  revealAfter,
  speed,
  insetLeft = 0,
  insetRight = 0,
  insetBottom = 0,
  from,
  to,
  highlight,
  selectedId,
  bounds,
  boundsKey,
  followBounds,
  mapStyle,
  marker,
  onSelect,
}: {
  events: GeoEvent[];
  color: string;
  cursor: number;
  // True while a story is being played (or paused mid-way): only then are hops drawn.
  story: boolean;
  // One marker per stop the story has reached, in order; the last two form the hop being drawn.
  storyPath: GeoEvent[];
  // Markers newer than this stay hidden until the hop arrives.
  revealAfter: number;
  speed: number;
  // Pixels covered by overlays on each side, so fits land in the visible part of the map.
  insetLeft?: number;
  insetRight?: number;
  insetBottom?: number;
  from: number;
  to: number;
  highlight: Set<string> | null;
  selectedId: string | null;
  bounds: [number, number, number, number] | null;
  boundsKey: number;
  followBounds: [number, number, number, number] | null;
  mapStyle: StyleSpecification | string;
  marker: MarkerStyle;
  onSelect: (id: string | null) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  // A cluster whose points cannot be separated by zooming (same geocoded
  // coordinate) is fanned out around its center instead. Tied to the visible
  // set so it closes when the time window moves on.
  const [spider, setSpider] = useState<Spider | null>(null);
  const [zoom, setZoom] = useState(2);

  // Only the events inside the time window go to the map, so clustering
  // reflects what is on screen. The set is keyed by id list to avoid
  // re-indexing the cluster tree while the window slides without changes.
  // While a hop is drawing, everything the step reveals stays hidden until
  // the line arrives.
  const n = storyPath.length;
  const hop = useMemo(() => (story && n >= 2 ? { key: `${storyPath[n - 2].id}>${storyPath[n - 1].id}`, from: storyPath[n - 2], to: storyPath[n - 1] } : null), [story, storyPath, n]);
  const [hopProgress, setHopProgress] = useState(1);
  const hideAfter = hop && hopProgress < 1 ? revealAfter : Infinity;
  const visible = useMemo(() => {
    const at = story ? storyTime : (e: GeoEvent) => e.t;
    const shown = events.filter((e) => at(e) <= cursor && e.t <= to && (e.tEnd ?? e.t) >= from);
    return hideAfter === Infinity ? shown : shown.filter((e) => storyTime(e) <= hideAfter);
  }, [events, cursor, from, to, hideAfter, story]);
  const visibleKey = useMemo(() => visible.map((e) => e.id).join(","), [visible]);
  const visibleStable = useMemo(() => visible, [visibleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { geojson, maxVal } = useMemo(() => {
    const vals = events.map((e) => e.value ?? 0).filter((v) => v > 0);
    const maxVal = vals.length ? Math.max(...vals) : 0;
    const dense = events.length > 2000;
    const sizeBy = marker.sizeByValue;
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: visibleStable.map((e) => ({
        type: "Feature",
        id: e.id,
        geometry: { type: "Point", coordinates: [e.lng, e.lat] },
        properties: {
          id: e.id,
          t: e.t,
          tEnd: e.tEnd ?? e.t,
          cat: e.category,
          color,
          r: sizeBy && maxVal > 0 && e.value != null && e.value > 0 ? (dense ? 3 : 5) + (dense ? 9 : 14) * Math.sqrt(e.value / maxVal) : dense ? 3.5 : 6,
          hl: highlight ? (highlight.has(e.id) ? 1 : 0) : 1,
          sel: e.id === selectedId ? 1 : 0,
        },
      })),
    };
    return { geojson: fc, maxVal };
  }, [events, visibleStable, color, highlight, selectedId, marker.sizeByValue]);
  void maxVal;

  const spiderOpen = spider && spider.key === visibleKey ? spider : null;
  const spiderGeo = useMemo<{ points: FeatureCollection<Point>; legs: FeatureCollection<LineString> } | null>(() => {
    if (!spiderOpen) return null;
    const byId: Record<string, (typeof geojson.features)[number]> = {};
    for (const f of geojson.features) byId[String(f.properties?.id)] = f;
    const [cx, cy] = project(spiderOpen.center[0], spiderOpen.center[1], zoom);
    const offs = spiderOffsets(spiderOpen.ids.length);
    const points: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
    const legs: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
    spiderOpen.ids.forEach((id, i) => {
      const src = byId[id];
      if (!src) return;
      const pos = unproject(cx + offs[i][0], cy + offs[i][1], zoom);
      points.features.push({ type: "Feature", id, geometry: { type: "Point", coordinates: pos }, properties: { ...src.properties } });
      legs.features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [spiderOpen.center, pos] } });
    });
    return { points, legs };
  }, [spiderOpen, geojson, zoom]);

  // Marker icons are rasterised on demand: the symbol layer asks for
  // `${shape}|${color}` and we draw it. The listener is attached the moment
  // the map instance exists (before the style loads) so no request is missed,
  // and it survives style switches.
  const attached = useRef<WeakSet<object>>(new WeakSet());
  const setMapRef = (r: MapRef | null) => {
    mapRef.current = r;
    const map = r?.getMap();
    if (!map || attached.current.has(map)) return;
    attached.current.add(map);
    (window as unknown as { __aigisMap?: unknown }).__aigisMap = map;
    setZoom(map.getZoom());
    map.on("zoom", () => setZoom(map.getZoom()));
    map.on("styleimagemissing", (ev: { id: string }) => {
      const [shape, color] = ev.id.split("|");
      if (!color) return;
      const img =
        shape === "arrow" ? drawArrowIcon(color) : shape === "plane" || shape === "car" ? drawVehicleIcon(shape, color) : SHAPE_IDS.includes(shape as MarkerShape) ? drawMarkerIcon(shape as MarkerShape, color) : null;
      if (img && !map.hasImage(ev.id)) map.addImage(ev.id, img, { pixelRatio: 2 });
    });
  };
  const iconImage = ["concat", marker.shape, "|", ["get", "color"]];
  const iconSize = ["interpolate", ["linear"], ["get", "r"], 3, 0.42, 6, 0.62, 12, 0.95, 19, 1.35];
  const selBoost = ["case", ["==", ["get", "sel"], 1], 1.35, 1];

  // Trail: one hop at a time, like a film showing a journey. The line runs
  // from the previous stop to the newest one, draws itself over a few
  // seconds, and is replaced by the next hop. Earlier hops stay as a
  // large-dashed route behind the solid one.
  const historyGeo = useMemo<FeatureCollection<LineString> | null>(() => {
    if (!story || storyPath.length < 3) return null;
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: storyPath.slice(0, -1).map((e) => [e.lng, e.lat]) } }] };
  }, [story, storyPath]);
  const hopKey = hop?.key ?? null;
  useEffect(() => {
    if (!hopKey) return;
    // Wait for the camera to frame the pair, then grow the line.
    let raf = 0;
    const t0 = performance.now() + STORY.frame / speed;
    const dur = STORY.draw / speed;
    const tick = (now: number) => {
      const lin = Math.min(1, Math.max(0, (now - t0) / dur));
      const k = Math.max(0.001, 1 - Math.pow(1 - lin, 3)); // ease out: quick start, gentle arrival
      setHopProgress(k);
      if (lin < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hopKey, speed]);
  const trailGeo: FeatureCollection<LineString> | null = hop
    ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[hop.from.lng, hop.from.lat], [hop.to.lng, hop.to.lat]] } }] }
    : null;
  const p = Math.max(0.001, Math.min(0.999, hopProgress));
  const trailGradient = ["step", ["line-progress"], color, p, "rgba(0,0,0,0)"] as unknown as ExpressionSpecification;
  // The plane at the head of the line.
  const headGeo = useMemo<FeatureCollection<Point> | null>(() => {
    if (!hop) return null;
    const [ax, ay] = project(hop.from.lng, hop.from.lat, 0);
    const [bx, by] = project(hop.to.lng, hop.to.lat, 0);
    const bearing = (Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI;
    const head = unproject(ax + (bx - ax) * p, ay + (by - ay) * p, 0);
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: { bearing, vehicle: "plane" }, geometry: { type: "Point", coordinates: head } }] };
  }, [hop, p]);

  const single = ["!", ["has", "point_count"]] as unknown as FilterSpecification;
  const clustered = ["has", "point_count"] as unknown as FilterSpecification;
  const clusterText = luminance(color) > 0.55 ? "#0b0d12" : "#ffffff";

  const hlFactor = ["case", ["==", ["get", "hl"], 1], 1, 0.12];

  // Padding scaled to the container so fitBounds never fails on a small window.
  const fit = useCallback((bb: [number, number, number, number], duration: number, maxZoom: number) => {
    const m = mapRef.current;
    if (!m) return;
    const c = m.getContainer();
    const w = c.clientWidth || 1000,
      h = c.clientHeight || 700;
    const free = Math.max(200, w - insetLeft - insetRight);
    const side = Math.min(120, free * 0.12);
    const padding = { top: Math.min(110, h * 0.12), bottom: Math.min(h * 0.45, insetBottom + 48), left: insetLeft + side, right: insetRight + side };
    m.fitBounds(bb, { padding, duration, maxZoom, essential: true });
  }, [insetLeft, insetRight, insetBottom]);

  useEffect(() => {
    if (!bounds) return;
    fit(bounds, 1600, 13);
  }, [bounds, boundsKey, fit]);

  // Follow mode: ease the camera onto whatever the time window is showing.
  useEffect(() => {
    if (!followBounds) return;
    fit(followBounds, STORY.frame, 11);
  }, [followBounds, fit]);

  const onClick = async (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (f?.properties?.point_count != null) {
      const map = mapRef.current?.getMap();
      const src = map?.getSource("events") as import("maplibre-gl").GeoJSONSource | undefined;
      if (!map || !src) return;
      const clusterId = Number(f.properties.cluster_id);
      if (spiderOpen?.clusterId === clusterId) {
        setSpider(null);
        return;
      }
      const center = (f.geometry as Point).coordinates as [number, number];
      const leaves = await src.getClusterLeaves(clusterId, 300, 0);
      const ids = leaves.map((l) => String(l.properties?.id));
      const pts = leaves.map((l) => (l.geometry as Point).coordinates as [number, number]);
      const bb = bboxOf(pts);
      const key = visibleKey;
      // Points that still overlap at the deepest clustering zoom are, for all
      // practical purposes, the same place (a city centroid, one address).
      const [ax, ay] = project(bb[0], bb[3], CLUSTER_MAX_ZOOM);
      const [bx, by] = project(bb[2], bb[1], CLUSTER_MAX_ZOOM);
      const coincident = Math.hypot(bx - ax, by - ay) < CLUSTER_RADIUS;
      if (!coincident) {
        // Zooming separates them: bring the whole set into view, as close as
        // it takes for the nearest pair to stand apart.
        setSpider(null);
        const target = Math.min(16, Math.max(separationZoom(pts) + 0.3, map.getZoom() + 1));
        const c = map.getContainer();
        const pad = Math.min(80, (Math.min(c.clientWidth || 1000, c.clientHeight || 700) * 0.1) | 0);
        map.fitBounds(bb, { padding: { top: pad + 70, bottom: pad + 170, left: pad, right: pad }, maxZoom: target, duration: 700, essential: true });
        return;
      }
      // Same coordinate: fan them out, at street level so the fan has context.
      const open = () => {
        setZoom(map.getZoom());
        setSpider({ key, center, ids, clusterId });
      };
      if (map.getZoom() < 13.5) {
        map.once("moveend", open);
        map.easeTo({ center, zoom: 14, duration: 700, essential: true });
      } else open();
      return;
    }
    if (!f) setSpider(null);
    onSelect(f ? String(f.properties?.id) : null);
  };

  return (
    <Map
      ref={setMapRef}
      mapLib={maplibregl}
      mapStyle={mapStyle}
      initialViewState={bounds ? { bounds, fitBoundsOptions: { padding: { top: 90, bottom: insetBottom + 48, left: insetLeft + 80, right: insetRight + 80 }, maxZoom: 12 } } : { longitude: 0, latitude: 20, zoom: 1.5 }}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["spider-points", "events", "clusters"]}
      onClick={onClick}
      onMouseEnter={() => {
        const c = mapRef.current?.getCanvas();
        if (c) c.style.cursor = "pointer";
      }}
      onMouseLeave={() => {
        const c = mapRef.current?.getCanvas();
        if (c) c.style.cursor = "";
      }}
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {events.length > 0 && (
        <FitAllControl
          onFit={() => {
            setSpider(null);
            fit(bboxOf(events.map((e) => [e.lng, e.lat])), 900, 12);
          }}
        />
      )}
      {historyGeo && (
        <Source id="trail-history" type="geojson" data={historyGeo}>
          <Layer id="trail-history" type="line" paint={{ "line-color": color, "line-width": 2, "line-opacity": 0.6, "line-dasharray": [4, 3] }} layout={{ "line-join": "round" }} />
        </Source>
      )}
      {trailGeo && (
        <Source id="trail" type="geojson" data={trailGeo} lineMetrics>
          <Layer id="trail-line" type="line" paint={{ "line-width": 3, "line-opacity": 0.95, "line-gradient": trailGradient }} layout={{ "line-join": "round", "line-cap": "round" }} />
        </Source>
      )}
      {headGeo && hopProgress < 1 && (
        <Source id="trail-head" type="geojson" data={headGeo}>
          <Layer
            id="trail-head"
            type="symbol"
            layout={{
              "icon-image": ["concat", ["get", "vehicle"], `|${color}`] as unknown as string,
              "icon-size": 0.56,
              "icon-rotate": ["get", "bearing"] as unknown as number,
              "icon-rotation-alignment": "map",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
          />
        </Source>
      )}
      <Source id="events" type="geojson" data={geojson} cluster clusterRadius={CLUSTER_RADIUS} clusterMaxZoom={CLUSTER_MAX_ZOOM}>
        <Layer
          id="clusters"
          type="circle"
          filter={clustered}
          paint={{
            "circle-color": color,
            "circle-opacity": 0.85,
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 23, 200, 28],
            "circle-stroke-color": color,
            "circle-stroke-opacity": 0.35,
            "circle-stroke-width": 6,
          }}
        />
        <Layer
          id="cluster-count"
          type="symbol"
          filter={clustered}
          layout={{ "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }}
          paint={{ "text-color": clusterText }}
        />
        {marker.glow && (
          <Layer
            id="events-glow"
            type="circle"
            filter={single}
            paint={{
              "circle-radius": ["*", ["get", "r"], 2.4],
              "circle-color": ["get", "color"],
              "circle-blur": 1,
              "circle-opacity": ["*", 0.35, hlFactor] as unknown as number,
            }}
          />
        )}
        <Layer
          id="events-sel"
          type="circle"
          filter={["all", single, ["==", ["get", "sel"], 1]] as unknown as FilterSpecification}
          paint={{
            "circle-radius": ["+", ["*", ["get", "r"], 1.6], 6],
            "circle-color": "#ffffff",
            "circle-opacity": 0.25,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="events"
          type="symbol"
          filter={single}
          layout={{
            "icon-image": iconImage as unknown as string,
            "icon-size": ["*", iconSize, selBoost] as unknown as number,
            "icon-anchor": shapeAnchor(marker.shape),
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "symbol-sort-key": ["-", 0, ["get", "sel"]] as unknown as number,
          }}
          paint={{
            "icon-opacity": ["*", 1, hlFactor] as unknown as number,
          }}
        />
      </Source>
      {spiderGeo && (
        <>
          <Source id="spider-legs" type="geojson" data={spiderGeo.legs}>
            <Layer id="spider-legs" type="line" paint={{ "line-color": color, "line-width": 1.2, "line-opacity": 0.55 }} />
          </Source>
          <Source id="spider" type="geojson" data={spiderGeo.points}>
            {marker.glow && (
              <Layer
                id="spider-glow"
                type="circle"
                paint={{
                  "circle-radius": ["*", ["get", "r"], 2.4],
                  "circle-color": ["get", "color"],
                  "circle-blur": 1,
                  "circle-opacity": ["*", 0.35, hlFactor] as unknown as number,
                }}
              />
            )}
            <Layer
              id="spider-sel"
              type="circle"
              filter={["==", ["get", "sel"], 1] as unknown as FilterSpecification}
              paint={{
                "circle-radius": ["+", ["*", ["get", "r"], 1.6], 6],
                "circle-color": "#ffffff",
                "circle-opacity": 0.25,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2,
              }}
            />
            <Layer
              id="spider-points"
              type="symbol"
              layout={{
                "icon-image": iconImage as unknown as string,
                "icon-size": ["*", iconSize, selBoost] as unknown as number,
                "icon-anchor": shapeAnchor(marker.shape),
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "symbol-sort-key": ["-", 0, ["get", "sel"]] as unknown as number,
              }}
              paint={{ "icon-opacity": ["*", 1, hlFactor] as unknown as number }}
            />
          </Source>
        </>
      )}
    </Map>
  );
}


function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}


// Zoom back out to everything. Clicking a cluster or marker zooms in and
// there was no way home. Lives in MapLibre's control stack under the zoom
// buttons so it looks and behaves like one of them.
function FitAllControl({ onFit }: { onFit: () => void }) {
  const ref = useRef(onFit);
  useEffect(() => {
    ref.current = onFit;
  }, [onFit]);
  useControl(
    () => {
      const el = document.createElement("div");
      el.className = "maplibregl-ctrl maplibregl-ctrl-group";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = "Fit all events";
      btn.setAttribute("aria-label", "Fit all events");
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>';
      btn.onclick = () => ref.current();
      el.appendChild(btn);
      return { onAdd: () => el, onRemove: () => el.remove() };
    },
    { position: "top-right" },
  );
  return null;
}

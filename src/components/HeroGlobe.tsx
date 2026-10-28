"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Source, type MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection, LineString, Point } from "geojson";
import maplibregl from "@/lib/map/maplibre";
import { buildStyle, themeById } from "@/lib/map/styles";
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

// A natural earth: Natural Earth II relief in colour under translucent blue
// water, green land, no labels, no roads. Built from the Forest theme and
// then adjusted, so it stays a normal style the generator understands.
function heroStyle(): StyleSpecification {
  const base = buildStyle({
    ...themeById("forest"),
    background: "#2f6b3a",
    water: "#1a5db0",
    waterLine: "#3b82f6",
    wood: "#245a2c",
    park: "#3c7a40",
    boundary: "#e8f1e4",
    hillshade: true,
    hillshadeOpacity: 1,
    saturation: 0.25,
    roadStyle: "hidden",
    buildings: false,
    landcoverOpacity: 0.5,
  });
  const layers = base.layers
    .filter((l) => l.type !== "symbol")
    .map((l) => {
      if (l.id === "hillshade") return { ...l, maxzoom: 7, paint: { ...l.paint, "raster-opacity": 1, "raster-saturation": 0.75, "raster-contrast": 0.3, "raster-brightness-min": 0.04 } };
      if (l.id === "water") return { ...l, paint: { ...l.paint, "fill-opacity": 0.72 } };
      if (l.id === "boundary-country") return { ...l, paint: { ...l.paint, "line-opacity": 0.25 } };
      return l;
    });
  return { ...base, layers, projection: { type: "globe" } } as StyleSpecification;
}
const HERO_STYLE = heroStyle();

// [lng, lat, theme]
const THEMES = { trip: "#f59e0b", west: "#fb923c", art: "#a78bfa", biz: "#22d3ee" } as const;
type Theme = keyof typeof THEMES;
const PTS: [number, number, Theme][] = [
  [-0.13, 51.5, "trip"], [2.35, 48.86, "trip"], [4.9, 52.37, "trip"], [13.4, 52.52, "trip"], [14.43, 50.08, "trip"], [16.37, 48.21, "trip"], [12.33, 45.44, "trip"], [11.25, 43.77, "trip"], [12.5, 41.9, "trip"], [2.17, 41.39, "trip"],
  [-90.2, 38.63, "west"], [-94.42, 39.09, "west"], [-99.0, 40.64, "west"], [-104.53, 42.21, "west"], [-110.39, 41.32, "west"], [-111.89, 40.76, "west"], [-112.54, 41.62, "west"], [-121.49, 38.58, "west"], [-122.42, 37.77, "west"], [-104.99, 39.74, "west"], [-105.94, 35.69, "west"], [-122.61, 45.36, "west"], [-119.65, 39.31, "west"], [-103.73, 44.38, "west"],
  [9.19, 45.46, "art"], [3.22, 51.21, "art"], [3.72, 51.05, "art"], [11.08, 49.45, "art"], [-4.02, 39.86, "art"], [11.88, 45.41, "art"], [10.79, 45.16, "art"], [11.55, 45.55, "art"], [7.35, 48.03, "art"],
  [-74.0, 40.71, "biz"], [-118.24, 34.05, "biz"], [-87.63, 41.88, "biz"], [-46.63, -23.55, "biz"], [-43.17, -22.91, "biz"], [-58.38, -34.6, "biz"], [139.65, 35.68, "biz"], [126.98, 37.57, "biz"], [103.82, 1.35, "biz"], [72.88, 19.08, "biz"], [106.85, -6.21, "biz"], [151.21, -33.87, "biz"], [144.96, -37.81, "biz"], [51.53, 25.29, "biz"], [55.27, 25.2, "biz"], [3.38, 6.52, "biz"], [36.82, -1.29, "biz"], [28.05, -26.2, "biz"], [-99.13, 19.43, "biz"], [121.47, 31.23, "biz"], [-79.38, 43.65, "biz"], [46.68, 24.71, "biz"],
];

export function HeroGlobe() {
  const mapRef = useRef<MapRef>(null);
  const [t, setT] = useState(0);
  // Spin as soon as the map instance exists; waiting for "load" stalls on
  // slow tile servers and the earth would never turn.
  const setMap = (r: MapRef | null) => {
    mapRef.current = r;
    const m = r?.getMap();
    if (m) (window as unknown as { __heroMap?: unknown }).__heroMap = m;
  };

  const points = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: PTS.map(([lng, lat, theme], i) => ({
        type: "Feature",
        properties: { color: THEMES[theme], phase: (i * 0.37) % 1 },
        geometry: { type: "Point", coordinates: [lng, lat] },
      })),
    }),
    [],
  );
  const lines = useMemo<FeatureCollection<LineString>>(() => {
    const byTheme: Record<string, [number, number][]> = {};
    for (const [lng, lat, th] of PTS) (byTheme[th] ??= []).push([lng, lat]);
    return {
      type: "FeatureCollection",
      features: (["trip", "west", "biz"] as Theme[]).map((th) => ({
        type: "Feature",
        properties: { color: THEMES[th] },
        geometry: { type: "LineString", coordinates: byTheme[th] },
      })),
    };
  }, []);
  // Trace: a bright head travelling along each route, with a fading tail.
  const [trace, setTrace] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lng = -40;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const m = mapRef.current?.getMap();
      if (m) {
        lng += dt * 0.0055;
        m.jumpTo({ center: [lng, 18] });
      }
      setT((now / 2400) % 1);
      setTrace((now / 7000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // pulse: radius grows then fades per point, staggered by phase
  const p = ["%", ["+", t, ["get", "phase"]], 1];
  const ringRadius = ["interpolate", ["linear"], p, 0, 2, 1, 22];
  const ringOpacity = ["interpolate", ["linear"], p, 0, 0.7, 1, 0];
  // Gradient stops must strictly ascend, so build them and drop any that would collide.
  const head = 0.02 + trace * 0.96;
  const stops: [number, string][] = [];
  const push = (x: number, c: string) => {
    if (x > 1) return;
    if (!stops.length || x > stops[stops.length - 1][0] + 0.0005) stops.push([x, c]);
  };
  push(0, "rgba(255,255,255,0)");
  push(head - 0.25, "rgba(255,255,255,0)");
  push(head - 0.02, "rgba(255,255,255,0.85)");
  push(head, "rgba(255,255,255,1)");
  push(head + 0.004, "rgba(255,255,255,0)");
  const traceGradient = ["interpolate", ["linear"], ["line-progress"], ...stops.flat()] as unknown as ExpressionSpecification;

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(96,165,250,0.22) 0%, rgba(96,165,250,0.08) 34%, rgba(7,9,15,0) 52%)" }} />
      <Map
        ref={setMap}
        mapLib={maplibregl}
        mapStyle={HERO_STYLE}
        initialViewState={{ longitude: -40, latitude: 18, zoom: 2.35 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
        interactive={false}
        attributionControl={false}
        canvasContextAttributes={{ antialias: true }}
      >
        <Source id="hero-lines" type="geojson" data={lines} lineMetrics>
          <Layer id="hero-lines" type="line" paint={{ "line-color": ["get", "color"], "line-width": 1.2, "line-opacity": 0.5, "line-dasharray": [1.5, 2] }} />
          <Layer id="hero-trace-glow" type="line" paint={{ "line-width": 7, "line-blur": 4, "line-gradient": traceGradient, "line-opacity": 0.6 }} layout={{ "line-cap": "round" }} />
          <Layer id="hero-trace" type="line" paint={{ "line-width": 2, "line-gradient": traceGradient }} layout={{ "line-cap": "round" }} />
        </Source>
        <Source id="hero-pts" type="geojson" data={points}>
          <Layer id="hero-rings" type="circle" paint={{ "circle-radius": ringRadius as unknown as number, "circle-color": "transparent", "circle-stroke-color": ["get", "color"], "circle-stroke-width": 1.2, "circle-stroke-opacity": ringOpacity as unknown as number }} />
          <Layer id="hero-dots" type="circle" paint={{ "circle-radius": 3.2, "circle-color": ["get", "color"], "circle-opacity": 0.95, "circle-blur": 0.2 }} />
          <Layer id="hero-glow" type="circle" paint={{ "circle-radius": 9, "circle-color": ["get", "color"], "circle-opacity": 0.25, "circle-blur": 1 }} />
        </Source>
      </Map>
    </div>
  );
}

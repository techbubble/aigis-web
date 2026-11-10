import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import { z } from "zod";

// Parametric MapLibre styles over OpenFreeMap's OpenMapTiles vector tiles
// (OpenStreetMap data). One theme object -> one complete style, so the
// number of distinct basemaps is unbounded and a model can design them.

export const TextureSchema = z.object({
  url: z.string().describe("Seamless tile image"),
  opacity: z.number().describe("0 to 1"),
  blend: z.enum(["multiply", "overlay", "soft-light", "screen", "normal"]),
  scale: z.number().describe("Tile size on screen in pixels"),
});
export const HalftoneSchema = z.object({
  size: z.number().describe("Dot pitch in pixels, 3 to 8"),
  opacity: z.number().describe("0 to 1"),
  color: z.string().describe("Dot color"),
});

export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  background: z.string().describe("Land color, CSS hex"),
  water: z.string(),
  waterLine: z.string().describe("Rivers and water outlines"),
  wood: z.string().describe("Forest fill"),
  park: z.string(),
  residential: z.string().describe("Built-up area tint"),
  building: z.string(),
  roadMajor: z.string(),
  roadMinor: z.string(),
  roadCasing: z.string(),
  rail: z.string(),
  boundary: z.string(),
  label: z.string(),
  labelHalo: z.string(),
  labelFont: z.enum(["Noto Sans Regular", "Noto Sans Bold", "Noto Sans Italic"]),
  hillshade: z.boolean().describe("Blend Natural Earth shaded relief at low zoom"),
  hillshadeOpacity: z.number().describe("0 to 1"),
  landcoverOpacity: z.number().describe("0 to 1, how visible forests and parks are"),
  roadOpacity: z.number().describe("0 to 1"),
  labelDensity: z.enum(["sparse", "normal", "dense"]),
  mood: z.string().describe("A few words describing the intended feel"),
  // Treatments beyond flat color. Optional on stored themes; the designer
  // schema below requires every field so a model fills them all in.
  texture: TextureSchema.nullable().optional(),
  grain: z.number().optional().describe("0 to 1, film grain / paper noise over the whole map"),
  halftone: HalftoneSchema.nullable().optional(),
  edgeBleed: z.number().optional().describe("0 to 1, soft darker bleed along water, forest and park edges (watercolor pooling)"),
  edgeBleedColor: z.string().nullable().optional().describe("Bleed color; null derives it from the fill"),
  roadStyle: z.enum(["cased", "single", "hidden"]).optional().describe("cased: roads with an outline; single: one thin stroke; hidden: no roads"),
  lineStyle: z.enum(["solid", "sketch"]).optional().describe("sketch: broken, slightly blurred strokes like pen on paper"),
  buildings: z.boolean().optional().describe("Draw building footprints at high zoom"),
  labelTransform: z.enum(["none", "uppercase"]).optional().describe("City labels in capitals or not"),
  labelSpacing: z.number().optional().describe("Letter spacing in em, 0 to 0.4"),
  saturation: z.number().optional().describe("-1 to 1 applied to relief and texture imagery"),
  // Provenance for looks made in Studio.
  custom: z.boolean().optional(),
  prompt: z.string().optional(),
  texturePrompt: z.string().optional(),
  createdAt: z.string().optional(),
  owner: z.string().optional(),
});
export type Theme = z.infer<typeof ThemeSchema>;

// What the look designer must return: every treatment decided, nullable
// where "none" is the answer. Strict JSON schema friendly.
export const LookDesignSchema = ThemeSchema.omit({ id: true, texture: true, custom: true, prompt: true, texturePrompt: true, createdAt: true, owner: true }).extend({
  grain: z.number().describe("0 to 1, film grain / paper noise over the whole map. 0 for clean digital looks"),
  // Strict structured output on some providers rejects nullable objects, so
  // optional treatments carry an `enabled` flag instead.
  halftone: HalftoneSchema.extend({ enabled: z.boolean().describe("false for no dot screen") }),
  edgeBleed: z.number().describe("0 to 1, soft darker bleed along water, forest and park edges. 0 for crisp looks, 0.5 to 0.9 for watercolor, gouache, ink wash"),
  edgeBleedColor: z.string().nullable(),
  roadStyle: z.enum(["cased", "single", "hidden"]),
  lineStyle: z.enum(["solid", "sketch"]),
  buildings: z.boolean(),
  labelTransform: z.enum(["none", "uppercase"]),
  labelSpacing: z.number(),
  saturation: z.number(),
  textureOverlay: z
    .object({
      enabled: z.boolean().describe("false for flat digital looks with no surface texture"),
      prompt: z.string().describe("A prompt for an image model to paint one seamless square texture tile: the paper, canvas, grain or wash this look is printed on. No objects, no text, no map, just surface. Describe material, tone and tooth. Empty string when disabled"),
      opacity: z.number().describe("0 to 1"),
      blend: z.enum(["multiply", "overlay", "soft-light", "screen", "normal"]),
      scale: z.number().describe("Tile size on screen in pixels; use 2048"),
    })
    .describe("A generated surface texture laid over the map"),
});
export type LookDesign = z.infer<typeof LookDesignSchema>;

// Treatment defaults for the built-in themes and older saved looks.
export function withDefaults(t: Theme): Required<Pick<Theme, "grain" | "edgeBleed" | "roadStyle" | "lineStyle" | "buildings" | "labelTransform" | "labelSpacing" | "saturation">> & Theme {
  return {
    ...t,
    grain: t.grain ?? 0,
    edgeBleed: t.edgeBleed ?? 0,
    roadStyle: t.roadStyle ?? "cased",
    lineStyle: t.lineStyle ?? "solid",
    buildings: t.buildings ?? true,
    labelTransform: t.labelTransform ?? "none",
    labelSpacing: t.labelSpacing ?? 0,
    saturation: t.saturation ?? -1,
  };
}

export const THEMES: Theme[] = [
  {
    id: "midnight",
    name: "Slate",
    background: "#315054",
    water: "#274549",
    waterLine: "#3b686d",
    wood: "#35565a",
    park: "#35565a",
    residential: "#35565a",
    building: "#3c6267",
    roadMajor: "#629ba3",
    roadMinor: "#48747a",
    roadCasing: "#315054",
    rail: "#4b7a81",
    boundary: "#75a7ae",
    label: "#deebed",
    labelHalo: "#315054",
    labelFont: "Noto Sans Regular",
    hillshade: false,
    hillshadeOpacity: 0,
    landcoverOpacity: 0.8,
    roadOpacity: 0.9,
    labelDensity: "normal",
    mood: "dusk control room",
  },
  {
    id: "parchment",
    name: "Parchment",
    background: "#e9dcc3",
    water: "#b9c7c2",
    waterLine: "#8fa6a3",
    wood: "#d7cfae",
    park: "#dcd4b0",
    residential: "#e2d3b6",
    building: "#cdbb9a",
    roadMajor: "#8b6b4a",
    roadMinor: "#b89b79",
    roadCasing: "#e9dcc3",
    rail: "#7d6650",
    boundary: "#7a5c3f",
    label: "#4a3523",
    labelHalo: "#efe4cf",
    labelFont: "Noto Sans Italic",
    hillshade: true,
    hillshadeOpacity: 0.35,
    landcoverOpacity: 0.7,
    roadOpacity: 0.85,
    labelDensity: "sparse",
    mood: "nineteenth century survey map",
  },
  {
    id: "fresco",
    name: "Fresco",
    background: "#efe3d2",
    water: "#9fb8c4",
    waterLine: "#7d9aa8",
    wood: "#cfcaa6",
    park: "#d9d3a9",
    residential: "#e6d6c0",
    building: "#c9ad92",
    roadMajor: "#9c5b3c",
    roadMinor: "#c49a7f",
    roadCasing: "#efe3d2",
    rail: "#8a6a55",
    boundary: "#8b4a2f",
    label: "#5a2f1c",
    labelHalo: "#f6ede0",
    labelFont: "Noto Sans Italic",
    hillshade: true,
    hillshadeOpacity: 0.25,
    landcoverOpacity: 0.6,
    roadOpacity: 0.8,
    labelDensity: "sparse",
    mood: "sun-faded Tuscan wall painting",
  },
  {
    id: "neon",
    name: "Neon",
    background: "#070512",
    water: "#03020a",
    waterLine: "#1a1040",
    wood: "#0b0820",
    park: "#0c0a24",
    residential: "#0d0a1f",
    building: "#150f33",
    roadMajor: "#5b2bd6",
    roadMinor: "#2a1a6b",
    roadCasing: "#070512",
    rail: "#3a2a7a",
    boundary: "#8a4dff",
    label: "#c9b8ff",
    labelHalo: "#070512",
    labelFont: "Noto Sans Bold",
    hillshade: false,
    hillshadeOpacity: 0,
    landcoverOpacity: 0.6,
    roadOpacity: 1,
    labelDensity: "normal",
    mood: "stadium floodlights and broadcast graphics",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    background: "#0f2f5c",
    water: "#0a2347",
    waterLine: "#3f6fa8",
    wood: "#11345f",
    park: "#123763",
    residential: "#123462",
    building: "#1a4478",
    roadMajor: "#9cc3ee",
    roadMinor: "#4f7fb8",
    roadCasing: "#0f2f5c",
    rail: "#6f9bd0",
    boundary: "#bcd6f5",
    label: "#dbe9fb",
    labelHalo: "#0f2f5c",
    labelFont: "Noto Sans Regular",
    hillshade: false,
    hillshadeOpacity: 0,
    landcoverOpacity: 0.5,
    roadOpacity: 0.9,
    labelDensity: "dense",
    mood: "engineering drawing",
  },
  {
    id: "noir",
    name: "Noir",
    background: "#111111",
    water: "#000000",
    waterLine: "#222222",
    wood: "#161616",
    park: "#181818",
    residential: "#151515",
    building: "#1e1e1e",
    roadMajor: "#9a9a9a",
    roadMinor: "#3a3a3a",
    roadCasing: "#111111",
    rail: "#444444",
    boundary: "#666666",
    label: "#e0e0e0",
    labelHalo: "#000000",
    labelFont: "Noto Sans Bold",
    hillshade: false,
    hillshadeOpacity: 0,
    landcoverOpacity: 0.5,
    roadOpacity: 1,
    labelDensity: "sparse",
    mood: "black and white photograph",
  },
  {
    id: "arctic",
    name: "Arctic",
    background: "#f3f6f9",
    water: "#cfe0ee",
    waterLine: "#9fc0d8",
    wood: "#e2ebe6",
    park: "#e4efe6",
    residential: "#eaeef2",
    building: "#d5dce3",
    roadMajor: "#8a98a8",
    roadMinor: "#c3ccd6",
    roadCasing: "#ffffff",
    rail: "#9aa6b3",
    boundary: "#7f8da0",
    label: "#2b3645",
    labelHalo: "#ffffff",
    labelFont: "Noto Sans Regular",
    hillshade: true,
    hillshadeOpacity: 0.2,
    landcoverOpacity: 0.8,
    roadOpacity: 0.9,
    labelDensity: "normal",
    mood: "clean, clinical daylight",
  },
  {
    id: "forest",
    name: "Forest",
    background: "#15241b",
    water: "#0b161a",
    waterLine: "#1f3a40",
    wood: "#1b3324",
    park: "#1d3626",
    residential: "#1b2a22",
    building: "#24362b",
    roadMajor: "#b9a26a",
    roadMinor: "#4f5a3d",
    roadCasing: "#15241b",
    rail: "#5a6450",
    boundary: "#8d9a6f",
    label: "#d9e2c9",
    labelHalo: "#15241b",
    labelFont: "Noto Sans Regular",
    hillshade: true,
    hillshadeOpacity: 0.3,
    landcoverOpacity: 1,
    roadOpacity: 0.8,
    labelDensity: "sparse",
    mood: "ranger station map",
  },
  {
    id: "terracotta",
    name: "Terracotta",
    background: "#2a1612",
    water: "#140a0a",
    waterLine: "#3a2420",
    wood: "#2f1c16",
    park: "#331f17",
    residential: "#301b16",
    building: "#3c2520",
    roadMajor: "#e07a4a",
    roadMinor: "#6a3a2c",
    roadCasing: "#2a1612",
    rail: "#7a4a3a",
    boundary: "#c96f4a",
    label: "#f3d9c8",
    labelHalo: "#2a1612",
    labelFont: "Noto Sans Regular",
    hillshade: false,
    hillshadeOpacity: 0,
    landcoverOpacity: 0.6,
    roadOpacity: 0.9,
    labelDensity: "normal",
    mood: "clay and ember",
  },
  {
    id: "inkwash",
    name: "Ink wash",
    background: "#f4f1ea",
    water: "#d8d6cf",
    waterLine: "#8f8c84",
    wood: "#e6e3da",
    park: "#e9e6dc",
    residential: "#eeebe3",
    building: "#cfcbc1",
    roadMajor: "#2b2b2b",
    roadMinor: "#9a978f",
    roadCasing: "#f4f1ea",
    rail: "#6f6c66",
    boundary: "#3a3a3a",
    label: "#1f1f1f",
    labelHalo: "#f4f1ea",
    labelFont: "Noto Sans Italic",
    hillshade: true,
    hillshadeOpacity: 0.4,
    landcoverOpacity: 0.5,
    roadOpacity: 0.85,
    labelDensity: "sparse",
    mood: "sumi-e brushwork",
  },
];

export function themeById(id: string | null | undefined, looks: Theme[] = []): Theme {
  return THEMES.find((t) => t.id === id) ?? looks.find((t) => t.id === id) ?? THEMES[0];
}

const TILES = "https://tiles.openfreemap.org/planet";
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const NE2 = "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png";

export function buildStyle(theme: Theme): StyleSpecification {
  const t = withDefaults(theme);
  const density = t.labelDensity === "sparse" ? 0 : t.labelDensity === "dense" ? 2 : 1;
  const font = [t.labelFont];
  const sketch = t.lineStyle === "sketch";
  // Sketch strokes: broken dashes and a touch of blur, like a nib on paper.
  const sketchLine = sketch ? { "line-dasharray": [5, 1.2, 2.5, 0.8], "line-blur": 0.6 } : {};
  const bleedColor = t.edgeBleedColor ?? mix(t.water, "#000000", 0.25);
  const caps = t.labelTransform === "uppercase" ? ("uppercase" as const) : ("none" as const);
  const layers: LayerSpecification[] = [
    { id: "background", type: "background", paint: { "background-color": t.background } },
  ];
  if (t.hillshade) {
    layers.push({
      id: "hillshade",
      type: "raster",
      source: "ne2",
      maxzoom: 6,
      paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 0, t.hillshadeOpacity, 6, 0], "raster-saturation": t.saturation, "raster-contrast": 0.2 },
    });
  }
  layers.push(
    {
      id: "landcover-wood",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]],
      paint: { "fill-color": t.wood, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, t.landcoverOpacity * 0.6, 10, t.landcoverOpacity] },
    },
    {
      id: "landcover-ice",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["ice", "glacier"]]],
      paint: { "fill-color": mix(t.background, "#ffffff", 0.35), "fill-opacity": 0.6 },
    },
    {
      id: "landuse-residential",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", ["get", "class"], ["literal", ["residential", "suburb", "neighborhood", "commercial", "industrial", "retail"]]],
      paint: { "fill-color": t.residential, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 12, 0.8] },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": t.park, "fill-opacity": t.landcoverOpacity },
    },
    {
      id: "landuse-park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", ["get", "class"], ["literal", ["park", "cemetery", "grass", "pitch", "garden"]]],
      paint: { "fill-color": t.park, "fill-opacity": t.landcoverOpacity },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: { "fill-color": t.water },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: { "line-color": t.waterLine, "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 8, 0.5, 14, 2.5] },
    },
    {
      id: "water-outline",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      minzoom: 4,
      paint: { "line-color": t.waterLine, "line-width": 0.6, "line-opacity": 0.6 },
    },
    ...(t.edgeBleed > 0
      ? ([
          {
            id: "bleed-water",
            type: "line",
            source: "openmaptiles",
            "source-layer": "water",
            filter: ["!=", ["get", "brunnel"], "tunnel"],
            paint: { "line-color": bleedColor, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 3, 10, 9], "line-blur": ["interpolate", ["linear"], ["zoom"], 2, 2, 10, 6], "line-opacity": 0.55 * t.edgeBleed },
          },
          {
            id: "bleed-wood",
            type: "line",
            source: "openmaptiles",
            "source-layer": "landcover",
            filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]],
            paint: { "line-color": mix(t.wood, "#000000", 0.3), "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 12, 7], "line-blur": 4, "line-opacity": 0.45 * t.edgeBleed * t.landcoverOpacity },
          },
          {
            id: "bleed-park",
            type: "line",
            source: "openmaptiles",
            "source-layer": "park",
            paint: { "line-color": mix(t.park, "#000000", 0.3), "line-width": 6, "line-blur": 4, "line-opacity": 0.45 * t.edgeBleed * t.landcoverOpacity },
          },
        ] as LayerSpecification[])
      : []),
    {
      id: "aeroway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "aeroway",
      minzoom: 10,
      filter: ["in", ["get", "class"], ["literal", ["runway", "taxiway"]]],
      paint: { "line-color": t.roadMinor, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 8], "line-opacity": t.roadOpacity },
    },
    ...(t.buildings
      ? ([
          {
            id: "building",
            type: "fill",
            source: "openmaptiles",
            "source-layer": "building",
            minzoom: 12,
            paint: { "fill-color": t.building, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 15, 0.9], "fill-outline-color": t.roadCasing },
          },
        ] as LayerSpecification[])
      : []),
    ...(t.roadStyle !== "hidden"
      ? ([
          {
            id: "road-path",
            type: "line",
            source: "openmaptiles",
            "source-layer": "transportation",
            minzoom: 13,
            filter: ["in", ["get", "class"], ["literal", ["path", "track", "pedestrian", "footway"]]],
            paint: { "line-color": t.roadMinor, "line-width": 0.8, "line-dasharray": [2, 2], "line-opacity": t.roadOpacity * 0.7 },
          },
          {
            id: "road-minor",
            type: "line",
            source: "openmaptiles",
            "source-layer": "transportation",
            minzoom: 9,
            filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary", "minor_road"]]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": t.roadMinor, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 9, 0.3, 14, 2, 18, 10], "line-opacity": t.roadOpacity, ...sketchLine },
          },
          ...(t.roadStyle === "cased"
            ? [
                {
                  id: "road-major-casing",
                  type: "line",
                  source: "openmaptiles",
                  "source-layer": "transportation",
                  minzoom: 6,
                  filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
                  layout: { "line-cap": "round", "line-join": "round" },
                  paint: { "line-color": t.roadCasing, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 6, 0.8, 12, 4, 18, 20], "line-opacity": 0.8 },
                },
              ]
            : []),
          {
            id: "road-major",
            type: "line",
            source: "openmaptiles",
            "source-layer": "transportation",
            minzoom: 5,
            filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": t.roadMajor,
              "line-width":
                t.roadStyle === "single"
                  ? ["interpolate", ["exponential", 1.4], ["zoom"], 5, 0.3, 12, 1.2, 18, 4]
                  : ["interpolate", ["exponential", 1.4], ["zoom"], 5, 0.4, 8, ["match", ["get", "class"], ["motorway", "trunk"], 1.2, 0.6], 12, ["match", ["get", "class"], ["motorway", "trunk"], 3, 1.6], 18, 14],
              "line-opacity": t.roadOpacity,
              ...sketchLine,
            },
          },
        ] as LayerSpecification[])
      : []),
    {
      id: "rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 8,
      filter: ["==", ["get", "class"], "rail"],
      paint: { "line-color": t.rail, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 14, 1.5], "line-dasharray": [4, 2], "line-opacity": t.roadOpacity * 0.8 },
    },
    {
      id: "boundary-state",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 3,
      filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
      paint: { "line-color": t.boundary, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.3, 8, 1], "line-dasharray": [2, 2], "line-opacity": 0.6 },
    },
    {
      id: "boundary-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1], ["!=", ["get", "disputed"], 1]],
      paint: { "line-color": t.boundary, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 6, 1.4, 10, 2.2], "line-opacity": 0.9, ...(sketch ? { "line-dasharray": [6, 1.5, 3, 1], "line-blur": 0.5 } : {}) },
    },
    {
      id: "boundary-disputed",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 2], ["==", ["get", "disputed"], 1]],
      paint: { "line-color": t.boundary, "line-width": 1.2, "line-dasharray": [3, 2], "line-opacity": 0.7 },
    },
    {
      id: "water-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      minzoom: density === 0 ? 5 : 3,
      filter: ["==", ["geometry-type"], "Point"],
      layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Noto Sans Italic"], "text-size": 11, "text-letter-spacing": 0.15, "text-max-width": 6 },
      paint: { "text-color": t.waterLine, "text-halo-color": t.water, "text-halo-width": 1 },
    },
    {
      id: "road-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: density === 0 ? 15 : 13,
      layout: { "symbol-placement": "line", "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": font, "text-size": 10, "text-letter-spacing": 0.05 },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1, "text-opacity": 0.8 },
    },
    {
      id: "place-other",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: density === 0 ? 12 : density === 2 ? 8 : 10,
      filter: ["in", ["get", "class"], ["literal", ["village", "hamlet", "suburb", "neighborhood", "quarter"]]],
      layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": font, "text-size": 10, "text-max-width": 8 },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1, "text-opacity": 0.75 },
    },
    {
      id: "place-town",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: density === 0 ? 9 : density === 2 ? 5 : 7,
      filter: ["==", ["get", "class"], "town"],
      layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": font, "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 12, 14], "text-max-width": 8, "text-transform": caps, "text-letter-spacing": t.labelSpacing },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1.2 },
    },
    {
      id: "place-city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: density === 0 ? 4 : 3,
      maxzoom: 14,
      filter: ["==", ["get", "class"], "city"],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": font,
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, ["case", ["<=", ["get", "rank"], 2], 12, 10], 8, ["case", ["<=", ["get", "rank"], 2], 18, 14], 12, 20],
        "text-max-width": 8,
        "text-transform": caps,
        "text-letter-spacing": t.labelSpacing,
      },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1.4 },
    },
    {
      id: "place-state",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 3,
      maxzoom: 8,
      filter: ["==", ["get", "class"], "state"],
      layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": font, "text-size": 11, "text-transform": "uppercase", "text-letter-spacing": 0.2 },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1, "text-opacity": 0.6 },
    },
    {
      id: "place-country",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      maxzoom: 7,
      filter: ["==", ["get", "class"], "country"],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 1, ["case", ["<=", ["get", "rank"], 1], 12, 9], 5, 16],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.25,
        "text-max-width": 7,
      },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1.5, "text-opacity": 0.85 },
    },
    {
      id: "place-continent",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      maxzoom: 2,
      filter: ["==", ["get", "class"], "continent"],
      layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Noto Sans Bold"], "text-size": 14, "text-transform": "uppercase", "text-letter-spacing": 0.4 },
      paint: { "text-color": t.label, "text-halo-color": t.labelHalo, "text-halo-width": 1.5, "text-opacity": 0.6 },
    },
  );

  return {
    version: 8,
    name: `AIGIS ${t.name}`,
    glyphs: GLYPHS,
    sources: {
      openmaptiles: {
        type: "vector",
        url: TILES,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &middot; <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>',
      },
      ...(t.hillshade ? { ne2: { type: "raster", tiles: [NE2], tileSize: 256, maxzoom: 6, attribution: "Natural Earth" } } : {}),
    },
    layers,
  };
}

function mix(a: string, b: string, k: number) {
  const pa = hex(a),
    pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
function hex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}

export function isDarkTheme(t: Theme) {
  const [r, g, b] = hex(t.background);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

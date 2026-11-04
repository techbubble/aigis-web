import { z } from "zod";

export const PlaceType = z.enum([
  "address",
  "city",
  "region",
  "country",
  "landmark",
  "coordinates",
  "other",
]);

// What the extraction model returns per event. Flat, all fields required
// (nullable where unknown) to satisfy strict JSON-schema subsets.
export const ExtractedEventSchema = z.object({
  title: z.string().describe("Short headline for the event, under 12 words"),
  summary: z.string().describe("One or two sentence summary"),
  place: z
    .string()
    .describe(
      "Most specific place name as written in the source, with disambiguating context (e.g. 'Springfield, Illinois, USA')",
    ),
  placeType: PlaceType,
  lat: z.number().nullable().describe("Latitude if known or confidently inferable, else null"),
  lng: z.number().nullable().describe("Longitude if known or confidently inferable, else null"),
  start: z
    .string()
    .nullable()
    .describe("ISO-8601 date or datetime when the event started or occurred, else null"),
  end: z.string().nullable().describe("ISO-8601 end date if the event spans time, else null"),
  category: z.string().describe("Short lowercase category label, e.g. 'outbreak', 'shipment', 'protest'"),
  value: z.number().nullable().describe("Primary numeric magnitude if any (count, amount, magnitude)"),
  unit: z.string().nullable().describe("Unit for value, e.g. 'cases', 'USD', 'Mw'"),
  entities: z.array(z.string()).describe("Named people, organizations or products involved"),
  confidence: z.number().describe("0 to 1 confidence that this is a real, correctly located, correctly dated event"),
  sourceQuote: z.string().describe("Verbatim short excerpt from the source supporting this event"),
});
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;

export const ExtractionResultSchema = z.object({
  events: z.array(ExtractedEventSchema),
  notes: z.string().describe("Anything notable about the source: ambiguity, missing dates, document type"),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// Column mapping for tabular sources (CSV/XLSX). The model maps headers once;
// rows are converted deterministically.
export const TableMappingSchema = z.object({
  isGeospatial: z.boolean().describe("True if rows plausibly describe located, dated things"),
  titleColumn: z.string().nullable(),
  summaryColumns: z.array(z.string()).describe("Columns to concatenate into the summary"),
  placeColumns: z
    .array(z.string())
    .describe("Columns that together name a place, most specific first (e.g. city, state, country)"),
  latColumn: z.string().nullable(),
  lngColumn: z.string().nullable(),
  startColumn: z.string().nullable(),
  endColumn: z.string().nullable(),
  categoryColumn: z.string().nullable(),
  valueColumn: z.string().nullable(),
  unit: z.string().nullable(),
  dateFormatHint: z.string().nullable().describe("e.g. 'MM/DD/YYYY', 'unix seconds', 'ISO'"),
  rationale: z.string(),
});
export type TableMapping = z.infer<typeof TableMappingSchema>;

export type GeoEvent = {
  id: string;
  title: string;
  summary: string;
  place: string;
  placeType: z.infer<typeof PlaceType>;
  lat: number;
  lng: number;
  start: string; // ISO
  end: string | null;
  t: number; // epoch ms of start
  tEnd: number | null;
  category: string;
  value: number | null;
  unit: string | null;
  entities: string[];
  confidence: number;
  sourceQuote: string;
  sourceFile: string;
  geocoder: "source" | "model" | "photon" | "nominatim" | "exif";
  // Present when the event was derived from a photo.
  media?: EventMedia;
};

export type EventMedia = {
  thumb: string;
  full: string;
  w: number;
  h: number;
  // Where the image came from when it was found for the event rather than uploaded with it.
  credit?: string;
  link?: string;
};

export type SourceFile = {
  name: string;
  kind: "table" | "text" | "pdf" | "image" | "photo" | "json";
  bytes: number;
  rows?: number;
  chunks?: number;
  // Rows or extracted events from this file that did not make it onto the map.
  dropped?: { noTime: number; noLocation: number; lowConfidence: number };
};

export type DatasetSummary = {
  count: number;
  tMin: number | null;
  tMax: number | null;
  categories: { name: string; count: number }[];
  topPlaces: { name: string; count: number }[];
  bbox: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
  dropped: { noTime: number; noLocation: number; lowConfidence: number };
};

export type Dataset = {
  id: string;
  name: string;
  subtitle?: string;
  createdAt: string;
  sources: SourceFile[];
  events: GeoEvent[];
  summary: DatasetSummary;
  insights?: Insight[];
  // Studio settings, chosen by the creator and shown as-is to viewers.
  theme?: string;
  marker?: MarkerStyle;
  // Ownership. Single user today; shaped for real accounts later.
  owner?: string;
  editors?: string[];
  savedAt?: string;
  // Position in the owner's list of stories (lower first).
  position?: number;
};

export type MarkerShape = "pin" | "dot" | "ring" | "diamond" | "square" | "star";
// One shape and one color for every marker on a map. Category is metadata, not a legend.
// trail is a legacy field: the route is always drawn now.
export type MarkerStyle = { shape: MarkerShape; color: string; sizeByValue: boolean; glow: boolean; trail?: boolean };
export const DEFAULT_MARKER: MarkerStyle = { shape: "pin", color: "#f43f5e", sizeByValue: true, glow: true };
export const MARKER_COLORS = ["#38bdf8", "#f59e0b", "#f43f5e", "#a78bfa", "#34d399", "#e879f9", "#facc15", "#e6e9f0", "#0f172a"];

export type Insight = {
  id: string;
  kind: "anomaly" | "trend" | "cluster" | "correlation" | "gap";
  title: string;
  detail: string;
  score: number;
  eventIds: string[];
  timeRange: [number, number] | null;
  bbox: [number, number, number, number] | null;
};

export type IngestProgress =
  | { type: "status"; message: string; pct?: number }
  | { type: "source"; source: SourceFile }
  | { type: "events"; count: number }
  | { type: "done"; datasetId: string; summary: DatasetSummary }
  | { type: "error"; message: string };

# Muse in AIGIS

AIGIS turns unstructured material (documents, spreadsheets, photos, scans) into animated time-series maps. Every step that needs judgement rather than arithmetic is delegated to a Meta Muse model. This file lists each of those steps, which model handles it, how it is prompted, and what happens around it.

All calls go through the Vercel AI SDK (`ai` v7) against the Vercel AI Gateway, so a model is a plain `provider/model` string. The IDs live in `src/lib/ai/models.ts` and can be overridden per environment:

| Role    | Default               | Env var              | Used for                                                     |
| ------- | --------------------- | -------------------- | ------------------------------------------------------------ |
| extract | `meta/muse-spark-1.3` | `AIGIS_EXTRACT_MODEL`| Event extraction, table mapping, photo captions, look design |
| chat    | `meta/muse-spark-1.3` | `AIGIS_CHAT_MODEL`   | The Explore agent (streaming, tool calling)                  |
| image   | `meta/muse-image-1.0` | `AIGIS_IMAGE_MODEL`  | Surface textures for custom map looks                        |
| deep    | `meta/muse-wonder-1.0`| `AIGIS_DEEP_MODEL`   | Reserved; not called yet                                     |

Authentication is the Gateway's: `AI_GATEWAY_API_KEY` locally, Vercel OIDC in deployment.

## 1. Ingest: source material to located, dated events

Entry points: `POST /api/ingest` (new Aigis) and `POST /api/datasets/[id]/sources` (add to an existing one). Both stream progress as NDJSON and run `runIngest` in `src/lib/ingest/pipeline.ts`.

### 1a. Text extraction (`src/lib/ingest/extract.ts`, `extractFromText`)

- Input: PDF, DOCX, Markdown, TXT, HTML, email and similar, parsed to plain text and split into chunks of about 7,000 characters with 400 characters of overlap (`chunkText` in `parse.ts`). Chunks run four at a time.
- Model: Muse Spark via `generateText` with `Output.object(ExtractionResultSchema)`, temperature 0.1.
- System prompt casts the model as a geospatial analyst. It must return one event per distinct (what, where, when), the most specific place with disambiguating parents, ISO dates (first of month or year when only that is known), a reusable lowercase category, an optional value and unit, a verbatim source quote under 200 characters, a confidence score, and no invented events. Coordinates are returned only when the model is sure (well known cities, landmarks); otherwise null and the geocoder fills them in.
- The file name and any document date are passed so relative dates ("last Tuesday") can be resolved.

### 1b. Image extraction (`extractFromImage`)

Scans, charts, screenshots, maps and tables as images go to the same model and schema as a file part in a multimodal message. The prompt tells it to read signage, captions, axis labels and legends and extract located, dated events.

### 1c. Spreadsheet column mapping (`inferTableMapping`)

CSV and XLSX files are never sent row by row. Muse Spark sees the header list and eight sample rows and returns a `TableMapping` (which columns hold time, place, latitude, longitude, title, value, category), temperature 0. The pipeline then maps every row deterministically. Explicit lat/lng columns are preferred over place names.

### 1d. Photo captioning (`src/lib/ingest/photos.ts`, `processPhoto`)

A photo becomes one event. EXIF supplies GPS and capture time when present (camera-local time is converted using the recorded offset or an estimate from longitude). Muse Spark's vision receives a 1,024px copy and returns a structured caption: a 3 to 8 word title, a one or two sentence summary, a place guess with type, a category from a fixed list, visible entities, and confidence. The place guess is used only when there is no GPS fix. With GPS, confidence is raised to at least 0.9.

### 1e. After the model

- Events whose confidence is below 0.35 (`MIN_CONFIDENCE`) or that lack a time or location are counted as dropped and reported in the dataset summary.
- Places without coordinates are geocoded with Photon, then Nominatim (`src/lib/geo/geocode.ts`), three at a time. Each event records whether its position came from `exif`, `source`, `photon`, `nominatim` or `model`.
- `summarize` and `detectInsights` (`src/lib/analysis/insights.ts`) run without a model: temporal bursts by z-score, spatial hotspots on a grid, value outliers, lead/lag correlations between categories, and silences. These are stored on the dataset as findings and are the evidence the Explore agent reasons over, so the model is never asked to eyeball thousands of rows.

## 2. Explore: the chat agent over a dataset

Route: `POST /api/chat` (`src/app/api/chat/route.ts`). Client: the Explore tab in the studio panel (`ChatPanel.tsx`, `@ai-sdk/react` `useChat`).

- Model: Muse Spark via `streamText`, temperature 0.3, up to 6 tool steps per answer.
- System prompt: dataset name, span, sources, drop counts, categories, top places, the top 15 precomputed findings, and, when the dataset has 400 events or fewer, every event inlined as a compact `id|date|category|place|title|value` line. Larger datasets are not inlined; the model is told to query instead. It is instructed to cite places, dates and counts, keep answers under 150 words, never invent events, and present cause and effect only as a hypothesis backed by timing and location.
- Tools:
  - `focusMap` (client-side, schema in `src/lib/ai/tools.ts`): time range, categories, place filter, event ids to highlight, a bbox to fly to, whether to start playback, and a caption. The route declares it without `execute`; `ChatPanel` runs it on the browser and answers with "Map updated." The prompt tells the model to call it whenever the user asks to see, show, replay, focus or compare, and to put the call before its prose.
  - `queryEvents` (server): substring, category, place, date, minimum value filters; returns up to 200 events plus counts by category and by day/month/year bucket.
  - `getEvent` (server): the full record for one id, including summary, entities and source quote.
  - `getInsights` (server): the precomputed findings, optionally filtered by kind.
- The Findings list at the top of the Explore tab is the same precomputed data; "Investigate why" on a finding seeds a chat turn.

## 3. Look designer: a basemap style from a sentence

Route: `POST /api/looks` with `{ prompt }`; repaint with `PATCH /api/looks/[id] { repaint: true }`. Code in `src/lib/map/design.ts`.

### 3a. Design (`designLook`)

Muse Spark is prompted as a cartographic designer and returns a `LookDesignSchema` object: every colour the style generator needs (land, water, wood, park, residential, building, road major/minor/casing, rail, boundary, label and halo), hillshade and its opacity, landcover and road opacity, label density, edge bleed, line style (solid or sketch), road style (cased, single, hidden), buildings on or off, halftone (enabled, size, opacity, colour), grain, relief saturation, label transform and spacing, and a `textureOverlay` block (enabled, prompt, opacity, blend, scale). The prompt explains how each field renders and the design rules (must read at zoom 2 and zoom 13, water above roads in contrast, markers are the subject). Two built-in looks are included as calibration examples. The result is saved as a `Theme` with `custom: true` and renders through `buildStyle` in `src/lib/map/styles.ts` exactly like a built-in look.

Muse Spark's structured output returns an empty object when the schema contains nullable nested objects, so the schema uses flat objects with `enabled` flags. If the output lacks `background` the route throws rather than saving a blank look.

### 3b. Texture (`paintTexture`)

When the design enables a texture overlay, Muse Image paints it. The look's texture prompt is prefixed with a fixed instruction (flat surface, even lighting, no objects, text or large strokes, uniform fine grain edge to edge). Muse Image returns 1,600px regardless of the requested size, so:

- two generations are requested in parallel;
- each is used twice, the second copy rotated a half turn, placed diagonally so no tile sits beside itself;
- `matchTone` normalises each tile's per-channel mean and spread to the group average;
- `blendTiles` composites them on a torus with 320px feathered overlaps, so there are no seams and no mirror symmetry, and writes a 2,560px JPEG;
- the file is stored under `looks/` via `saveMedia` and displayed by `LookOverlay` at 2,048px per repeat in screen space with the chosen blend mode.

A failed texture does not fail the look. Repaint reuses the stored `texturePrompt`, or a fallback derived from the original brief for looks saved before that field existed.

## Operational notes

- `maxDuration` is 120s on the chat, ingest and looks routes.
- Muse Spark ignores `temperature` and logs a warning; the values are left in place for providers that honour it.
- Every structured call uses zod schemas from `src/lib/types.ts` or `src/lib/map/styles.ts`, so the model's output is validated before it touches storage.
- No model call is made at render time. Viewing an Aigis reads stored events, findings and looks only.

# AIGIS

**When maps tell a story.**

AIGIS turns unstructured material into animated time-series maps. Drop in reports, spreadsheets, photos, scans or news. Agents built on Meta's Muse models pull out every event that has a place and a time, geocode it, look for patterns and anomalies, and hand back a map you can scrub through time and interrogate in plain language.

Live at [aigis.studio](https://aigis.studio). Built for the Meta Global AI Developer Hackathon, November 2026.

## What it does

1. **Ingest.** Upload PDFs, Word files, Markdown, text, HTML, CSV, XLSX or photos. Text is chunked and read by Muse Spark, which returns structured events (what, where, when, category, value, confidence, source quote). Spreadsheets are mapped column to field once, then converted row by row. Photos take place and time from EXIF; Muse Spark's vision writes the caption and recognises the landmark. Places without coordinates are geocoded against OpenStreetMap.
2. **Analyse.** A deterministic pattern engine scores temporal bursts, spatial hotspots, value outliers, lead/lag correlations between categories, and gaps. The findings are stored with the dataset and become evidence for the agent.
3. **Watch.** The map animates through time with a scrubbable timeline, playback speeds, clustering, spiderfied coincident points, an ordered trail with direction arrows, and a detail panel with media. Markers, colour and the basemap look are the creator's choices and are saved with the Aigis.
4. **Explore.** Ask questions in the panel. The agent cites places, dates and counts, queries the dataset through tools, and moves the map itself (filter, highlight, fly, play) so the answer is shown, not just described.
5. **Design.** Describe a basemap look in a sentence. Muse Spark designs the complete style (colours, relief, road treatment, labels, halftone, grain) and Muse Image paints a seamless surface texture when the look calls for one. Watercolour, photocopy, pixel world, impasto: each becomes a reusable look.

Every saved map is an **Aigis**. Studio creates and edits; View is read-only for sharing.

## Demos

Four pre-built Aigises ship with the app and open instantly:

| Aigis | Sources |
| --- | --- |
| A Family Summer in Europe | A camera roll, nothing else |
| Settlement of the American West | Historical chronicle + towns table |
| The Renaissance, City by City | Catalogue of works + essay |
| Voltic: A Decade of Sports Sponsorships | Business ledger + strategy memo |

## How AIGIS uses Muse

AIGIS is built on the Meta Model API. Every judgement call in the product is a Muse call; the deterministic parts (geocoding, statistics, map rendering) exist to give Muse good evidence and to render what it returns. Model IDs are gateway strings and can be overridden by environment variable (see `src/lib/ai/models.ts`).

| Model | Role in AIGIS |
| --- | --- |
| **Muse Spark 1.3** | Reads documents and scans and returns structured events (structured output, 7,000 character chunks, four in flight). Maps spreadsheet headers onto the event schema from eight sample rows. Captions photos from a 1,024px copy and recognises landmarks (vision). Designs a complete basemap style from a one-line brief. Runs the Explore agent: streaming answers with four tools, one of which drives the map in the browser. |
| **Muse Image 1.0** | Paints the surface texture for a custom look (paper tooth, toner, canvas, pixel grid). Two renderings are tone-matched, rotated and feathered into one seamless 2,560px tile. |

What Muse Spark is asked to do, in order of appearance in the product:

1. **Extraction.** System prompt casts it as a geospatial analyst: one event per (what, where, when), ISO dates, lowercase categories reused across the document, a verbatim source quote, a confidence score, and coordinates only when certain. Output is validated against a zod schema before anything is stored.
2. **Table mapping.** One call per spreadsheet, temperature 0, returning which columns carry time, place, lat/lng, title, value and category. Rows are then converted without the model.
3. **Photo captions.** Album-style title, description, place guess with type, category, visible entities, confidence. EXIF wins for position and time; the model's place guess is used only without a GPS fix.
4. **Explore agent.** The system prompt carries the dataset summary, the top precomputed findings and, for datasets of 400 events or fewer, every event as one compact line. Tools: `focusMap` (client-side: filter, highlight, fly, play, caption), `queryEvents`, `getEvent`, `getInsights`. Up to six tool steps per answer. It is told to show the answer on the map before describing it.
5. **Look designer.** Returns every colour and treatment the style generator needs plus a texture prompt for Muse Image. The prompt explains how each field renders and the rules a basemap must obey so event markers stay the subject.

[MUSE.md](MUSE.md) documents each call site, prompt, schema and the handling around it.

Muse calls are routed through the Vercel AI Gateway to Meta's own endpoint (provider `meta`, zero data retention). No other model provider is used.

## Hackathon

Entry for the [Meta Global AI Developer Hackathon](https://dev.meta.ai/events/global-hackathon), submissions due November 4, 2026, 9:00 PM ET.

**Problem.** Most of what people know about where and when things happened is trapped in prose, spreadsheets and camera rolls. Turning that into a map that moves takes a GIS analyst and days of cleanup.

**Users.** Anyone with a pile of dated, located material: journalists, researchers, students, analysts, travellers, brand and operations teams.

**How Meta's models are used.** Muse Spark 1.3 for extraction, vision, structured design and the tool-calling agent; Muse Image 1.0 for generated map textures. Detailed above and in [MUSE.md](MUSE.md).

**Next.** Multi-user accounts, SAM-based region extraction from maps and charts, Muse Wonder for long multi-document investigations, exports (video, embeds), and shared editing.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Vercel AI SDK 7, MapLibre GL with OpenFreeMap vector tiles, sharp for image work, Vercel Blob for storage in production and the local filesystem in development.

## Running locally

```bash
pnpm install
vercel link && vercel env pull   # AI Gateway auth via OIDC
pnpm dev                         # http://localhost:3003
```

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Gateway auth outside Vercel (instead of OIDC) |
| `AIGIS_EXTRACT_MODEL`, `AIGIS_CHAT_MODEL`, `AIGIS_IMAGE_MODEL` | Override model IDs |
| `BLOB_READ_WRITE_TOKEN` | Store datasets, media and looks in Vercel Blob; omitted, `.data/` is used |

`pnpm build` and `pnpm lint` run the production build and ESLint.

## Layout

```
src/app            routes: landing, /studio, /studio/[id], /view/[id], /api/*
src/components     Explorer, MapView, Timeline, ChatPanel, DesignPanel, SourcesPanel, HeroGlobe
src/lib/ingest     parsing, chunking, extraction, photos, pipeline
src/lib/ai         model IDs, shared tool schemas
src/lib/analysis   pattern engine
src/lib/map        style generator, look designer, texture painter
src/lib/geo        geocoding
public/samples     bundled demo datasets and media
```

Map data © OpenStreetMap contributors, tiles by OpenFreeMap.

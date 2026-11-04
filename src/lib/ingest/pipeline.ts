import { nanoid } from "nanoid";
import type { Dataset, ExtractedEvent, GeoEvent, IngestProgress, SourceFile, TableMapping } from "../types";
import { chunkText, parseFile, type ParsedSource, type Row } from "./parse";
import { extractFromImage, extractFromText, inferTableMapping } from "./extract";
import { geocode, geocodeMany, mapLimit } from "../geo/geocode";
import { detectInsights, summarize } from "../analysis/insights";
import { saveDataset } from "../store";
import { deleteMedia } from "../media";
import { processPhoto, type PhotoMeta } from "./photos";
import type { EventMedia } from "../types";

export type InputFile = { name: string; bytes: Uint8Array; mediaType: string; meta?: PhotoMeta };

const MIN_CONFIDENCE = 0.35;
const LLM_CONCURRENCY = 4;
const GEO_CONCURRENCY = 3;

// With `into`, the new files are added to that story: a file with the same
// name as an existing source replaces it, everything else is appended, and
// the summary and findings are recomputed over the whole set.
export async function runIngest(
  opts: { id?: string; name: string; subtitle?: string; files: InputFile[]; docDate?: string; theme?: string; owner?: string; into?: Dataset },
  emit: (p: IngestProgress) => void,
): Promise<Dataset> {
  const id = opts.into?.id ?? opts.id ?? nanoid(10);
  const sources: SourceFile[] = [];
  const drafts: { e: ExtractedEvent; sourceFile: string; fromRow?: { lat: number | null; lng: number | null }; media?: EventMedia; eventId?: string }[] = [];
  const metaByName = new Map(opts.files.filter((f) => f.meta).map((f) => [f.name, f.meta!]));
  const dropped = { noTime: 0, noLocation: 0, lowConfidence: 0 };
  // Per file too, so replacing a source later can subtract its share.
  const droppedBy: Record<string, typeof dropped> = {};
  const drop = (file: string, k: keyof typeof dropped) => {
    dropped[k]++;
    (droppedBy[file] ??= { noTime: 0, noLocation: 0, lowConfidence: 0 })[k]++;
  };

  emit({ type: "status", message: `Parsing ${opts.files.length} file(s)`, pct: 2 });
  const parsed: ParsedSource[] = [];
  for (const f of opts.files) {
    try {
      parsed.push(await parseFile(f.name, f.bytes, f.mediaType));
    } catch (err) {
      emit({ type: "status", message: `Could not parse ${f.name}: ${(err as Error).message}` });
    }
  }

  let step = 0;
  const totalSteps = parsed.reduce((n, p) => n + (p.kind === "text" ? chunkText(p.text).length : 1), 0) || 1;

  for (const src of parsed) {
    if (src.kind === "table") {
      emit({ type: "status", message: `Mapping columns of ${src.file.name} (${src.rows.length} rows)`, pct: 5 });
      const mapping = await inferTableMapping(src.file.name, src.headers, src.rows);
      if (!mapping.isGeospatial) {
        emit({ type: "status", message: `${src.file.name}: no geospatial structure found, treating as text` });
        const asText = src.rows.map((r) => src.headers.map((h) => `${h}: ${r[h]}`).join("; ")).join("\n");
        parsed.push({ kind: "text", file: { ...src.file, kind: "text" }, text: asText });
        continue;
      }
      let n = 0;
      for (const row of src.rows) {
        const e = rowToEvent(row, mapping);
        if (e) {
          drafts.push({ e: e.event, sourceFile: src.file.name, fromRow: { lat: e.lat, lng: e.lng } });
          n++;
        }
      }
      sources.push({ ...src.file, rows: src.rows.length });
      emit({ type: "source", source: sources[sources.length - 1] });
      emit({ type: "status", message: `${src.file.name}: ${n} rows mapped`, pct: 10 });
      step++;
    } else if (src.kind === "image") {
      // Photos (anything with a capture time or GPS in EXIF, or sent with
      // metadata from the browser) become one event each, with a thumbnail.
      // Other images (scans, charts, screenshots) go through text extraction.
      const meta = metaByName.get(src.file.name);
      const isPhoto = !!(meta?.time || (meta?.lat != null && meta?.lng != null)) || (await looksLikePhoto(src.data));
      if (isPhoto) {
        emit({ type: "status", message: `Reading photo ${src.file.name}: EXIF and Muse Spark vision`, pct: 10 });
        try {
          const eventId = nanoid(8);
          const r = await processPhoto({ datasetId: id, eventId, name: src.file.name, bytes: src.data, mediaType: src.mediaType, meta, docDate: opts.docDate });
          drafts.push({ e: r.event, sourceFile: src.file.name, media: r.media, eventId, fromRow: r.exif.lat != null && r.exif.lng != null ? { lat: r.exif.lat, lng: r.exif.lng } : undefined });
          emit({ type: "status", message: `${src.file.name}: ${r.event.title}${r.exif.lat != null ? " (GPS)" : ""}` });
          emit({ type: "events", count: drafts.length });
        } catch (err) {
          emit({ type: "status", message: `${src.file.name}: photo failed: ${(err as Error).message}` });
        }
      } else {
        emit({ type: "status", message: `Reading image ${src.file.name} with Muse Spark`, pct: 10 });
        try {
          const r = await extractFromImage(src.data, src.mediaType, { fileName: src.file.name });
          for (const e of r.events) drafts.push({ e, sourceFile: src.file.name });
          emit({ type: "status", message: `${src.file.name}: ${r.events.length} events. ${r.notes}` });
        } catch (err) {
          emit({ type: "status", message: `${src.file.name}: extraction failed: ${(err as Error).message}` });
        }
      }
      sources.push({ ...src.file, kind: isPhoto ? "photo" : "image" });
      emit({ type: "source", source: sources[sources.length - 1] });
      step++;
    } else {
      const chunks = chunkText(src.text);
      sources.push({ ...src.file, chunks: chunks.length });
      emit({ type: "source", source: sources[sources.length - 1] });
      emit({ type: "status", message: `Extracting from ${src.file.name} (${chunks.length} chunk${chunks.length === 1 ? "" : "s"})`, pct: 10 });
      const docDate = opts.docDate ?? guessDocDate(src.text);
      await mapLimit(chunks, LLM_CONCURRENCY, async (chunk, i) => {
        try {
          const r = await extractFromText(chunk, { fileName: src.file.name, docDate });
          for (const e of r.events) drafts.push({ e, sourceFile: src.file.name });
          step++;
          emit({
            type: "status",
            message: `${src.file.name} chunk ${i + 1}/${chunks.length}: ${r.events.length} events`,
            pct: 10 + Math.round((step / totalSteps) * 55),
          });
          emit({ type: "events", count: drafts.length });
        } catch (err) {
          step++;
          emit({ type: "status", message: `${src.file.name} chunk ${i + 1}: extraction failed: ${(err as Error).message}` });
        }
      });
    }
  }

  // Resolve locations
  const needGeo = drafts.filter((d) => !(d.fromRow && d.fromRow.lat != null && d.fromRow.lng != null) && (d.e.lat == null || d.e.lng == null || d.e.placeType === "address" || d.e.placeType === "landmark"));
  emit({ type: "status", message: `Geocoding ${needGeo.length} place(s)`, pct: 70 });
  const uniquePlaces = [...new Set(needGeo.map((d) => d.e.place))];
  await geocodeMany(uniquePlaces, GEO_CONCURRENCY, (done) => {
    if (done % 10 === 0) emit({ type: "status", message: `Geocoded ${done}/${uniquePlaces.length}`, pct: 70 + Math.round((done / uniquePlaces.length) * 20) });
  });

  const events: GeoEvent[] = [];
  for (const d of drafts) {
    const e = d.e;
    if (e.confidence < MIN_CONFIDENCE) {
      drop(d.sourceFile, "lowConfidence");
      continue;
    }
    const t = parseTime(e.start);
    if (t == null) {
      drop(d.sourceFile, "noTime");
      continue;
    }
    let lat: number | null = null,
      lng: number | null = null,
      geocoder: GeoEvent["geocoder"] = "model";
    if (d.fromRow && d.fromRow.lat != null && d.fromRow.lng != null) {
      lat = d.fromRow.lat;
      lng = d.fromRow.lng;
      geocoder = d.media ? "exif" : "source";
    } else {
      const hit = needGeo.includes(d) ? await geocode(e.place) : null;
      if (hit) {
        lat = hit.lat;
        lng = hit.lng;
        geocoder = hit.provider;
      } else if (e.lat != null && e.lng != null) {
        lat = e.lat;
        lng = e.lng;
        geocoder = "model";
      }
    }
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      drop(d.sourceFile, "noLocation");
      continue;
    }
    const tEnd = parseTime(e.end);
    events.push({
      id: d.eventId ?? nanoid(8),
      title: e.title,
      summary: e.summary,
      place: e.place,
      placeType: e.placeType,
      lat,
      lng,
      start: new Date(t).toISOString(),
      end: tEnd != null ? new Date(tEnd).toISOString() : null,
      t,
      tEnd,
      category: normCat(e.category),
      value: e.value,
      unit: e.unit,
      entities: e.entities ?? [],
      confidence: e.confidence,
      sourceQuote: e.sourceQuote,
      sourceFile: d.sourceFile,
      geocoder,
      ...(d.media ? { media: d.media } : {}),
    });
  }
  for (const s of sources) s.dropped = droppedBy[s.name] ?? { noTime: 0, noLocation: 0, lowConfidence: 0 };
  let allEvents = events,
    allSources = sources,
    allDropped = dropped;
  const into = opts.into;
  if (into) {
    const replaced = new Set(sources.map((s) => s.name));
    const gone = into.events.filter((e) => replaced.has(e.sourceFile) && e.media);
    if (gone.length) await deleteMedia(into.id, gone.flatMap((e) => [e.media!.thumb, e.media!.full]));
    allEvents = [...into.events.filter((e) => !replaced.has(e.sourceFile)), ...events];
    allSources = [...into.sources.filter((s) => !replaced.has(s.name)), ...sources];
    // Kept sources carry their own counts; replaced ones are recounted.
    const kept = into.sources.filter((s) => !replaced.has(s.name));
    const d0 = kept.reduce((a, s) => ({ noTime: a.noTime + (s.dropped?.noTime ?? 0), noLocation: a.noLocation + (s.dropped?.noLocation ?? 0), lowConfidence: a.lowConfidence + (s.dropped?.lowConfidence ?? 0) }), { noTime: 0, noLocation: 0, lowConfidence: 0 });
    allDropped = { noTime: d0.noTime + dropped.noTime, noLocation: d0.noLocation + dropped.noLocation, lowConfidence: d0.lowConfidence + dropped.lowConfidence };
  }
  allEvents.sort((a, b) => a.t - b.t);

  emit({ type: "status", message: `Analyzing ${allEvents.length} events for patterns`, pct: 92 });
  const summary = summarize(allEvents, allDropped);
  const insights = detectInsights({ events: allEvents, summary });

  const ds: Dataset = into
    ? { ...into, sources: allSources, events: allEvents, summary, insights, savedAt: new Date().toISOString() }
    : { id, name: opts.name, subtitle: opts.subtitle, createdAt: new Date().toISOString(), sources, events, summary, insights, theme: opts.theme, owner: opts.owner };
  await saveDataset(ds);
  emit({ type: "done", datasetId: id, summary });
  return ds;
}

function normCat(c: string) {
  return (c || "event").toLowerCase().trim().replace(/[^a-z0-9 _-]/g, "").replace(/\s+/g, " ").slice(0, 40) || "event";
}

export function parseTime(s: string | null | undefined): number | null {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  // unix seconds / ms
  if (/^-?\d{9,10}$/.test(str)) return parseInt(str, 10) * 1000;
  if (/^-?\d{12,13}$/.test(str)) return parseInt(str, 10);
  // bare year, possibly negative or with BCE
  const bce = /^(\d{1,4})\s*(BC|BCE)$/i.exec(str);
  if (bce) return Date.UTC(-parseInt(bce[1], 10) + 1, 0, 1);
  if (/^\d{3,4}$/.test(str)) return Date.UTC(parseInt(str, 10), 0, 1);
  if (/^\d{3,4}-\d{2}$/.test(str)) {
    const [y, m] = str.split("-").map(Number);
    return Date.UTC(y, m - 1, 1);
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d.getTime();
  // MM/DD/YYYY
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(str);
  if (us) {
    const y = us[3].length === 2 ? 2000 + parseInt(us[3], 10) : parseInt(us[3], 10);
    return Date.UTC(y, parseInt(us[1], 10) - 1, parseInt(us[2], 10));
  }
  return null;
}

function guessDocDate(text: string): string | undefined {
  const m = /\b(20\d{2}|19\d{2})-(\d{2})-(\d{2})\b/.exec(text.slice(0, 2000));
  return m ? m[0] : undefined;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function rowToEvent(row: Row, m: TableMapping): { event: ExtractedEvent; lat: number | null; lng: number | null } | null {
  const get = (c: string | null) => (c && row[c] != null ? String(row[c]).trim() : "");
  const lat = m.latColumn ? num(row[m.latColumn]) : null;
  const lng = m.lngColumn ? num(row[m.lngColumn]) : null;
  const placeParts = m.placeColumns.map(get).filter(Boolean);
  const place = placeParts.join(", ");
  if (!place && (lat == null || lng == null)) return null;
  const start = get(m.startColumn);
  if (!start) return null;
  const title = get(m.titleColumn) || placeParts[0] || place || `${get(m.categoryColumn) || "event"} at ${lat},${lng}`;
  const summary = m.summaryColumns
    .map((c) => (row[c] != null && row[c] !== "" ? `${c}: ${row[c]}` : ""))
    .filter(Boolean)
    .join("; ");
  return {
    lat,
    lng,
    event: {
      title: title.slice(0, 120),
      summary: summary.slice(0, 600),
      place: place || `${lat}, ${lng}`,
      placeType: lat != null ? "coordinates" : placeParts.length > 1 ? "city" : "other",
      lat,
      lng,
      start,
      end: get(m.endColumn) || null,
      category: get(m.categoryColumn) || "record",
      value: m.valueColumn ? num(row[m.valueColumn]) : null,
      unit: m.unit,
      entities: [],
      confidence: 0.9,
      sourceQuote: Object.entries(row)
        .slice(0, 6)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
        .slice(0, 200),
    },
  };
}

export function readMultipart(form: FormData): { name: string; subtitle?: string; files: Promise<InputFile>[]; docDate?: string; theme?: string } {
  const name = String(form.get("name") ?? "Untitled dataset");
  const subtitle = form.get("subtitle") ? String(form.get("subtitle")).slice(0, 200) : undefined;
  const docDate = form.get("docDate") ? String(form.get("docDate")) : undefined;
  const theme = form.get("theme") ? String(form.get("theme")) : undefined;
  // Optional per-file photo metadata read in the browser before resizing.
  let metas: Record<string, PhotoMeta> = {};
  try {
    metas = form.get("meta") ? (JSON.parse(String(form.get("meta"))) as Record<string, PhotoMeta>) : {};
  } catch {}
  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File)
    .map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), mediaType: f.type, meta: metas[f.name] }));
  return { name, subtitle, files, docDate, theme };
}

// A JPEG with EXIF (capture time or GPS) is a photo. Scans and screenshots rarely carry either.
async function looksLikePhoto(bytes: Uint8Array): Promise<boolean> {
  const { readPhotoMeta } = await import("./photos");
  const m = await readPhotoMeta(bytes);
  return !!(m.time || (m.lat != null && m.lng != null));
}

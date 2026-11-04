import exifr from "exifr";
import sharp from "sharp";
import { generateText, Output } from "ai";
import { z } from "zod";
import { MODELS } from "../ai/models";
import { PlaceType, type ExtractedEvent } from "../types";
import { saveMedia } from "../media";

// A photo becomes one event. Where and when come from EXIF whenever the
// camera recorded them; Muse Spark's vision writes the title, summary,
// category and a place guess (used only if there is no GPS fix).

export type PhotoMeta = { lat?: number | null; lng?: number | null; time?: string | null; make?: string | null; model?: string | null };

const CaptionSchema = z.object({
  title: z.string().describe("Short, specific caption, 3 to 8 words, like a photo album label"),
  summary: z.string().describe("One or two sentences describing what is happening and where, for someone who cannot see the photo"),
  place: z.string().nullable().describe("Best guess at the specific place (landmark, venue, neighborhood, city, country), or null if there are no clues"),
  placeType: PlaceType.nullable(),
  category: z.string().describe("One lowercase word: sightseeing, food, transport, nature, beach, museum, family, nightlife, shopping, sport, other"),
  entities: z.array(z.string()).describe("Named landmarks, places, artworks, foods or objects visible"),
  confidence: z.number().min(0).max(1).describe("Confidence in the place guess"),
});

export async function readPhotoMeta(bytes: Uint8Array): Promise<PhotoMeta> {
  try {
    const x = (await exifr.parse(Buffer.from(bytes), {
      pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "Make", "Model", "GPSLatitude", "GPSLongitude", "GPSLatitudeRef", "GPSLongitudeRef"],
      reviveValues: false,
      translateValues: false,
    })) as Record<string, unknown> | undefined;
    if (!x) return {};
    const gps = await exifr.gps(Buffer.from(bytes)).catch(() => null);
    const raw = (x.DateTimeOriginal ?? x.CreateDate) as string | undefined;
    const offset = typeof x.OffsetTimeOriginal === "string" ? x.OffsetTimeOriginal : null;
    const lat = gps?.latitude ?? null,
      lng = gps?.longitude ?? null;
    return { lat, lng, time: exifTimeToIso(raw, offset, lng), make: (x.Make as string) ?? null, model: (x.Model as string) ?? null };
  } catch {
    return {};
  }
}

// "YYYY:MM:DD HH:MM:SS" is camera-local time. Use the recorded offset when
// present, otherwise estimate the zone from longitude (15 degrees per hour).
export function exifTimeToIso(raw: string | undefined, offset: string | null, lng: number | null): string | null {
  if (!raw) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  let offMin = 0;
  const om = offset ? /^([+-])(\d{2}):(\d{2})$/.exec(offset) : null;
  if (om) offMin = (om[1] === "-" ? -1 : 1) * (Number(om[2]) * 60 + Number(om[3]));
  else if (lng != null) offMin = Math.round(lng / 15) * 60;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - offMin * 60000;
  return new Date(utc).toISOString();
}

export async function processPhoto(opts: { datasetId: string; eventId: string; name: string; bytes: Uint8Array; mediaType: string; meta?: PhotoMeta; docDate?: string }) {
  const meta = { ...(await readPhotoMeta(opts.bytes)), ...stripNull(opts.meta ?? {}) };
  const img = sharp(Buffer.from(opts.bytes)).rotate();
  const info = await img.metadata();
  const [full, thumb] = await Promise.all([
    img.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer({ resolveWithObject: true }),
    img.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer({ resolveWithObject: true }),
  ]);
  const [fullUrl, thumbUrl] = await Promise.all([saveMedia(opts.datasetId, `${opts.eventId}.jpg`, full.data), saveMedia(opts.datasetId, `${opts.eventId}-thumb.jpg`, thumb.data)]);

  // Caption with a small version of the image; the model never needs 1600px.
  const forModel = await img.clone().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const { output: cap } = await generateText({
    model: MODELS.extract,
    reasoning: "none",
    output: Output.object({ schema: CaptionSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Photo file: ${opts.name}.`,
              meta.time ? `Taken ${meta.time}.` : "",
              meta.lat != null && meta.lng != null ? `GPS: ${meta.lat.toFixed(5)}, ${meta.lng.toFixed(5)} (use this to name the place precisely).` : "No GPS in the file; infer the place from visual clues if you can.",
              "Write an album-style caption and description. Be concrete about landmarks you recognize.",
            ]
              .filter(Boolean)
              .join(" "),
          },
          { type: "file", mediaType: "image/jpeg", data: forModel },
        ],
      },
    ],
    temperature: 0.2,
  });

  const hasGps = meta.lat != null && meta.lng != null;
  const event: ExtractedEvent = {
    title: cap.title,
    summary: cap.summary,
    place: cap.place ?? (hasGps ? `${meta.lat!.toFixed(4)}, ${meta.lng!.toFixed(4)}` : "Unknown"),
    placeType: cap.placeType ?? "landmark",
    lat: hasGps ? meta.lat! : null,
    lng: hasGps ? meta.lng! : null,
    start: meta.time ?? opts.docDate ?? null,
    end: null,
    category: cap.category || "photo",
    value: null,
    unit: null,
    entities: cap.entities ?? [],
    confidence: hasGps ? Math.max(0.9, cap.confidence) : cap.confidence,
    sourceQuote: [meta.make, meta.model].filter(Boolean).join(" ") || "photo",
  };
  return {
    event,
    media: { thumb: thumbUrl, full: fullUrl, w: full.info.width, h: full.info.height },
    exif: { lat: meta.lat ?? null, lng: meta.lng ?? null, time: meta.time ?? null, width: info.width, height: info.height },
  };
}

function stripNull<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) as Partial<T>;
}

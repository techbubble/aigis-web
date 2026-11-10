// Geocoding with an in-process cache. Photon (komoot) first, Nominatim as
// fallback; both are free OSM-backed services, respect their usage policies.
// Whatever they cannot resolve (or when they are down or rate limited) goes
// to the language model in batches, which knows cities, venues and landmarks well
// enough for a map at the scale AIGIS draws.
import { generateText, Output } from "ai";
import { z } from "zod";
import { MODELS } from "../ai/models";

type Hit = { lat: number; lng: number; provider: "photon" | "nominatim" | "model" } | null;

const cache = new Map<string, Hit>();
const UA = "AIGIS/0.1 (aigis.studio)";

function norm(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

async function photon(q: string): Promise<Hit> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const j = (await res.json()) as { features?: { geometry: { coordinates: [number, number] } }[] };
  const f = j.features?.[0];
  if (!f) return null;
  return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], provider: "photon" };
}

let lastNominatim = 0;
async function nominatim(q: string): Promise<Hit> {
  // 1 request per second policy
  const wait = 1100 - (Date.now() - lastNominatim);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const j = (await res.json()) as { lat: string; lon: string }[];
  const f = j[0];
  if (!f) return null;
  return { lat: parseFloat(f.lat), lng: parseFloat(f.lon), provider: "nominatim" };
}

export async function geocode(place: string): Promise<Hit> {
  const key = norm(place);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  let hit: Hit = null;
  try {
    hit = await photon(place);
  } catch {
    hit = null;
  }
  if (!hit) {
    try {
      hit = await nominatim(place);
    } catch {
      hit = null;
    }
  }
  cache.set(key, hit);
  return hit;
}

const ModelGeo = z.object({
  places: z.array(
    z.object({
      place: z.string().describe("The place name exactly as given"),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

async function modelGeocode(places: string[]): Promise<Map<string, Hit>> {
  const out = new Map<string, Hit>();
  for (let i = 0; i < places.length; i += 40) {
    const batch = places.slice(i, i + 40);
    try {
      const { output } = await generateText({
        model: MODELS.extract,
        output: Output.object({ schema: ModelGeo }),
        system:
          "You are a gazetteer. For each place name return its latitude and longitude in decimal degrees (WGS84). Use the most specific match: a venue or landmark gets its own position, a neighborhood its center, a city its center, a region or country its centroid. Return null coordinates only when the name is not a real place or is too ambiguous to pin to one position. Confidence below 0.4 means a guess.",
        prompt: batch.map((p, k) => `${k + 1}. ${p}`).join("\n"),
        temperature: 0,
        reasoning: "none",
      });
      for (const r of output?.places ?? []) {
        if (r.lat == null || r.lng == null || r.confidence < 0.4 || Math.abs(r.lat) > 90 || Math.abs(r.lng) > 180) continue;
        out.set(norm(r.place), { lat: r.lat, lng: r.lng, provider: "model" });
      }
    } catch {
      /* leave the batch unresolved */
    }
  }
  return out;
}

// Resolve many places at once: providers in parallel, then one model pass
// for the misses. Results land in the cache so geocode(place) is free after.
export async function geocodeMany(places: string[], limit = 3, onProgress?: (done: number) => void): Promise<void> {
  const unique = [...new Set(places.map((p) => p.trim()).filter(Boolean))];
  let done = 0;
  await mapLimit(unique, limit, async (p) => {
    await geocode(p);
    onProgress?.(++done);
  });
  const misses = unique.filter((p) => !cache.get(norm(p)));
  if (!misses.length) return;
  const found = await modelGeocode(misses);
  for (const p of misses) {
    const hit = found.get(norm(p));
    if (hit) cache.set(norm(p), hit);
  }
}

// Bounded-concurrency helper used across the pipeline.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

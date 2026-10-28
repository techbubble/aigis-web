// Geocoding with an in-process cache. Photon (komoot) first, Nominatim as
// fallback. Both are free OSM-backed services; respect their usage policies.

type Hit = { lat: number; lng: number; provider: "photon" | "nominatim" } | null;

const cache = new Map<string, Hit>();
const UA = "AIGIS/0.1 (hackathon prototype)";

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

// Finds a public-domain image for each catalogue work in the Renaissance
// sample (Wikipedia page image via the REST summary API), stores a 1600px
// copy and a 480px thumb beside the sample, and writes `media` onto the
// event. Resumable: events that already have media are skipped.
// Run: node scripts/fetch-artworks.mjs [--force]
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const ID = "renaissance-art";
const ROOT = path.join(process.cwd(), "public/samples", ID);
const MEDIA = path.join(ROOT, "media");
const DATASET = path.join(ROOT, "dataset.json");
const STORED = path.join(process.cwd(), ".data/datasets", `sample-${ID}.json`);
const UA = "aigis-studio/0.1 (https://aigis.studio; demo build script)";
const force = process.argv.includes("--force");

const ds = JSON.parse(await fs.readFile(DATASET, "utf8"));
await fs.mkdir(MEDIA, { recursive: true });

function row(e) {
  const out = {};
  for (const part of String(e.sourceQuote || "").split(/,\s*(?=[a-z_]+=)/)) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

async function wiki(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) return null;
  return res.json();
}

// Event titles that are not artwork names, and search misses: pin the page.
const OVERRIDES = {
  "Sacrifice of Isaac competition panel": "Lorenzo_Ghiberti",
  "Dome of Santa Maria del Fiore begun": "Florence_Cathedral",
  "De pictura treatise": "De_pictura",
  "First journey to Venice": "Albrecht_Dürer",
  "Apocalypse woodcuts": "Apocalypse_(Dürer)",
  "Feast of the Rose Garlands": "Feast_of_the_Rosary",
  "New St Peter's foundation stone": "St._Peter's_Basilica",
  "Laocoon excavated": "Laocoön_and_His_Sons",
  "Death of Raphael": "Raphael",
  "Medici Chapel begun": "Sagrestia_Nuova",
  "Laurentian Library begun": "Laurentian_Library",
  "Eleonora of Toledo with her son": "Portrait_of_Eleanor_of_Toledo",
  "Perseus with the Head of Medusa begun": "Perseus_with_the_Head_of_Medusa",
  "Basilica Palladiana loggias begun": "Basilica_Palladiana",
  "Death of Michelangelo": "Michelangelo",
  "Teatro Olimpico begun": "Teatro_Olimpico",
  "St Francis in the Desert": "Saint_Francis_in_Ecstasy_(Bellini)",
  "Lives of the Artists published": "Lives_of_the_Most_Excellent_Painters,_Sculptors,_and_Architects",
  "Appointed architect of St Peter's": "St._Peter's_Basilica",
};

const STOP = new Set(["the", "of", "a", "an", "and", "in", "at", "to", "with", "begun", "completed", "published", "founded", "painted", "his", "her", "de", "del", "della", "di", "da"]);
function tokens(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w));
}
// The page must be about the work itself: most of the work's title words
// appear in the page title, and the page is not merely the artist's biography.
function isWork(pageTitle, title, artist) {
  const want = tokens(title);
  if (!want.length) return false;
  const have = new Set(tokens(pageTitle));
  const hit = want.filter((w) => have.has(w)).length;
  const artistTok = new Set(tokens(artist));
  const isArtistPage = [...have].every((w) => artistTok.has(w)) && have.size > 0;
  return !isArtistPage && hit / want.length >= 0.6;
}

async function findPage(title, artist) {
  if (OVERRIDES[title]) {
    const s = await wiki(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(OVERRIDES[title])}`);
    if (s?.originalimage?.source) return s;
    console.log("override missing page:", title, OVERRIDES[title]);
  }
  const queries = [`${title} ${artist}`, title, `${title} (${artist})`];
  for (const q of queries) {
    const r = await wiki(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(q)}&limit=5`);
    for (const hit of r?.pages ?? []) {
      if (!isWork(hit.title, title, artist)) continue;
      const s = await wiki(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.key)}`);
      if (s?.originalimage?.source) return s;
    }
  }
  return null;
}

// Wikimedia refuses some large thumbnails; walk down, then take the original.
async function fetchImage(source) {
  const base = source.replace(/\?.*$/, "");
  const tries = [1600, 1280, 1024, 800].map((w) => base.replace(/\/\d+px-/, `/${w}px-`));
  tries.push(base.replace("/thumb/", "/").replace(/\/[^/]+$/, ""));
  for (const url of tries) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

let done = 0,
  missed = [];
for (const e of ds.events) {
  if (e.sourceFile !== "works.csv") continue;
  const r0 = row(e);
  const ov = OVERRIDES[r0.title || e.title];
  const pinned = ov && e.media?.link && decodeURIComponent(e.media.link).endsWith("/" + ov);
  if (e.media && !force && (!ov || pinned)) {
    done++;
    continue;
  }
  delete e.media;
  const r = row(e);
  const title = r.title || e.title;
  const artist = r.artist || "";
  const page = await findPage(title, artist);
  if (!page) {
    missed.push(`${title} (${artist})`);
    continue;
  }
  const bytes = await fetchImage(page.originalimage.source);
  if (!bytes) {
    missed.push(`${title}: image unavailable`);
    continue;
  }
  const img = sharp(bytes, { failOn: "none", limitInputPixels: false });
  const full = await img.clone().rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const thumb = await sharp(full.data).resize({ width: 480, height: 480, fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  await fs.writeFile(path.join(MEDIA, `${e.id}-full.jpg`), full.data);
  await fs.writeFile(path.join(MEDIA, `${e.id}-thumb.jpg`), thumb);
  e.media = {
    thumb: `/samples/${ID}/media/${e.id}-thumb.jpg`,
    full: `/samples/${ID}/media/${e.id}-full.jpg`,
    w: full.info.width,
    h: full.info.height,
    credit: `${page.title} via Wikipedia / Wikimedia Commons`,
    link: page.content_urls?.desktop?.page,
  };
  done++;
  console.log("ok", title, "->", page.title, `${full.info.width}x${full.info.height}`);
  await fs.writeFile(DATASET, JSON.stringify(ds));
}
await fs.writeFile(DATASET, JSON.stringify(ds));
// Keep the stored copy (which carries saved design choices) in sync.
try {
  const stored = JSON.parse(await fs.readFile(STORED, "utf8"));
  const media = new Map(ds.events.map((e) => [e.id, e.media]));
  for (const e of stored.events) {
    if (media.get(e.id)) e.media = media.get(e.id);
    else delete e.media;
  }
  await fs.writeFile(STORED, JSON.stringify(stored));
} catch {
  /* no stored copy */
}
console.log(`done ${done}, missed ${missed.length}`);
for (const m of missed) console.log("  miss", m);

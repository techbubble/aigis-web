// Attaches one Wikimedia Commons photo per tour stop to the Eras Tour sample.
// photos.json lists the chosen files (title, 1600px url, author, licence).
// Each is stored as a 1600px copy and a 480px thumb beside the sample and
// written onto the matching show event with a credit and link. Resumable.
// Run after the sample has been ingested: node scripts/fetch-eras-photos.mjs
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const ID = "eras-tour";
const ROOT = path.join(process.cwd(), "public/samples", ID);
const MEDIA = path.join(ROOT, "media");
const STORED = path.join(process.cwd(), ".data/datasets", `sample-${ID}.json`);
const DATASET = path.join(ROOT, "dataset.json");
const UA = "aigis-studio/0.1 (https://aigis.studio; demo build script)";

const src = JSON.parse(await fs.readFile(STORED, "utf8").catch(() => fs.readFile(DATASET, "utf8")));
const picks = JSON.parse(await fs.readFile(path.join(ROOT, "photos.json"), "utf8"));
await fs.mkdir(MEDIA, { recursive: true });

const day = (t) => new Date(t).toISOString().slice(0, 10);
const shows = src.events.filter((e) => e.sourceFile === "shows.csv");
// The ledger's number is a per-night attendance; the column mapper leaves the unit blank.
for (const e of shows) if (e.value != null && !e.unit) e.unit = "attendance";
let n = 0;
for (const p of picks) {
  const inCity = shows.filter((e) => e.place.toLowerCase().includes(p.city.toLowerCase()));
  const ev = (p.date && inCity.find((e) => day(e.t) === p.date)) || inCity[0];
  if (!ev) {
    console.log("no event for", p.city, p.date);
    continue;
  }
  if (ev.media) {
    n++;
    continue;
  }
  const res = await fetch(p.url, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.log("fetch failed", p.title, res.status);
    continue;
  }
  const img = sharp(Buffer.from(await res.arrayBuffer())).rotate();
  const full = await img.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const thumb = await img.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
  await fs.writeFile(path.join(MEDIA, `${ev.id}-full.jpg`), full.data);
  await fs.writeFile(path.join(MEDIA, `${ev.id}-thumb.jpg`), thumb);
  ev.media = {
    thumb: `/samples/${ID}/media/${ev.id}-thumb.jpg`,
    full: `/samples/${ID}/media/${ev.id}-full.jpg`,
    w: full.info.width,
    h: full.info.height,
    credit: `${p.artist}, ${p.license}, via Wikimedia Commons`,
    link: p.page,
  };
  n++;
  console.log("attached", p.city, day(ev.t), ev.id);
}
// Every remaining show night gets a photo of its venue from the venue's
// Wikipedia page (lead image, licence and author read from Commons). One
// file per venue, shared by all nights there.
async function commonsInfo(fileTitle) {
  const q = new URLSearchParams({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1600", titles: fileTitle, format: "json", formatversion: "2" });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${q}`, { headers: { "user-agent": UA } }); // resolves local and Commons files alike
  if (!res.ok) return null;
  const page = (await res.json()).query?.pages?.[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const em = ii.extmetadata ?? {};
  const strip = (v) => String(v?.value ?? "").replace(/<[^>]+>/g, "").trim();
  return { url: ii.thumburl ?? ii.url, artist: strip(em.Artist), license: strip(em.LicenseShortName), page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle.replace(/ /g, "_"))}` };
}
// Venue names that are disambiguation pages on Wikipedia.
const VENUE_PAGE = { Olympiastadion: "Olympiastadion (Munich)", "Nissan Stadium": "Nissan Stadium (Nashville)", "National Stadium": "National Stadium, Singapore", "Stadium Australia": "Stadium Australia", "Estadio River Plate": "Estadio Monumental (Buenos Aires)" };
const venueMedia = new Map();
let v = 0;
for (const ev of shows) {
  const stale = ev.media && ev.media.thumb.includes("/venue-") && ev.media.credit === "Wikimedia Commons";
  if (ev.media && !stale) continue;
  if (stale) ev.media = undefined;
  const venue = ev.place.split(",")[0].trim();
  if (!venueMedia.has(venue)) {
    let media = null;
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent((VENUE_PAGE[venue] ?? venue).replace(/ /g, "_"))}`, { headers: { "user-agent": UA, accept: "application/json" } });
      const sum = res.ok ? await res.json() : null;
      const orig = sum?.originalimage?.source;
      if (orig) {
        // Large lead images come back as a thumb path (.../thumb/a/ab/Name.jpg/3840px-Name.jpg).
        const parts = new URL(orig).pathname.split("/");
        const fileTitle = "File:" + decodeURIComponent(parts.includes("thumb") ? parts[parts.length - 2] : parts[parts.length - 1]);
        const info = (await commonsInfo(fileTitle)) ?? { url: orig, artist: "", license: "", page: sum.content_urls?.desktop?.page };
        const img = sharp(Buffer.from(await (await fetch(info.url, { headers: { "user-agent": UA } })).arrayBuffer())).rotate();
        const full = await img.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer({ resolveWithObject: true });
        const thumb = await img.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
        const slug = "venue-" + venue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await fs.writeFile(path.join(MEDIA, `${slug}-full.jpg`), full.data);
        await fs.writeFile(path.join(MEDIA, `${slug}-thumb.jpg`), thumb);
        media = { thumb: `/samples/${ID}/media/${slug}-thumb.jpg`, full: `/samples/${ID}/media/${slug}-full.jpg`, w: full.info.width, h: full.info.height, credit: [info.artist, info.license].filter(Boolean).join(", ") + (info.artist || info.license ? ", via Wikimedia Commons" : "Wikimedia Commons"), link: info.page };
        v++;
        console.log("venue photo", venue);
      } else console.log("no image for", venue);
    } catch (err) {
      console.log("venue failed", venue, err.message);
    }
    venueMedia.set(venue, media);
  }
  const m = venueMedia.get(venue);
  if (m) {
    ev.media = m;
    n++;
  }
}
console.log(`${v} venue photos fetched`);

const body = JSON.stringify(src);
await fs.writeFile(STORED, body).catch(() => {});
await fs.writeFile(DATASET, body);
console.log(`${n} show nights with photos; ${src.events.length} events`);

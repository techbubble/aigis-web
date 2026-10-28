// Generates the geotagged photo set for the family demo with Muse Image,
// then writes EXIF (GPS, capture time, camera) so the ingest pipeline can
// read it like any phone photo. Resumable: existing files are skipped.
// Run: node --env-file=.env.local scripts/gen-photos.mjs
import { generateImage } from "ai";
import sharp from "sharp";
import piexif from "piexifjs";
import { promises as fs } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public/samples/europe-vacation/photos");
const MODEL = "meta/muse-image-1.0";
const STYLE = "Candid smartphone travel photo taken by a parent on a family trip, summer 2025, natural light, realistic, slightly imperfect handheld framing, no text, no watermark, no captions. ";

// [file, local time, lat, lng, prompt]
const SHOTS = [
  ["01_british_museum", "2025:06:21 15:10:00", 51.5194, -0.127, "Great Court of the British Museum under the glass roof, a nine year old boy asleep on a bench near a display case, afternoon light"],
  ["02_changing_guard", "2025:06:22 11:05:00", 51.5014, -0.1419, "Changing of the Guard at Buckingham Palace seen over the heads of a crowd, red tunics and bearskins, grey London sky"],
  ["03_london_eye", "2025:06:22 16:10:00", 51.5033, -0.1196, "view from inside a London Eye capsule over the Thames and Big Ben, two children pressed to the glass seen from behind"],
  ["04_cambridge_punt", "2025:06:23 12:30:00", 52.2043, 0.1149, "punting on the River Cam with King's College Chapel behind, a teenage girl trailing her hand in the water, green lawns"],
  ["05_notre_dame", "2025:06:24 19:40:00", 48.853, 2.3499, "interior of the restored Notre-Dame de Paris, bright cream limestone and stained glass, evening light, people looking up"],
  ["06_louvre_morning", "2025:06:25 09:30:00", 48.8611, 2.3358, "Louvre glass pyramid at 9 in the morning, short queue, two kids in sun hats walking ahead seen from behind"],
  ["07_arc_de_triomphe", "2025:06:25 17:30:00", 48.8738, 2.295, "view down the Champs-Elysees from the top of the Arc de Triomphe, hazy hot afternoon, a boy's hand on the railing"],
  ["08_eiffel_summit", "2025:06:26 10:45:00", 48.8584, 2.2945, "view from the Eiffel Tower summit over Paris rooftops toward the Seine, mid-morning, a girl's ponytail in the corner of the frame"],
  ["09_versailles_mirrors", "2025:06:27 13:00:00", 48.8049, 2.1204, "Hall of Mirrors at Versailles crowded with visitors, chandeliers, midday light through tall windows"],
  ["10_amsterdam_cruise", "2025:06:28 17:10:00", 52.3676, 4.884, "canal cruise boat on an Amsterdam canal, gabled houses and bicycles on a bridge, warm evening"],
  ["11_night_watch", "2025:06:29 15:30:00", 52.36, 4.8852, "the Night Watch painting being restored inside a glass box at the Rijksmuseum, conservators at work, visitors watching"],
  ["12_zaanse_schans", "2025:06:30 11:20:00", 52.4739, 4.8168, "windmills at Zaanse Schans with four rental bicycles leaning on a fence, blue sky with clouds, a boy fixing a bike chain"],
  ["13_brandenburg_dusk", "2025:07:01 20:30:00", 52.5163, 13.3777, "Brandenburg Gate at dusk, lit columns, a family of four walking toward it seen from behind"],
  ["14_wall_memorial", "2025:07:02 10:15:00", 52.5351, 13.3903, "Berlin Wall Memorial on Bernauer Strasse, rusted steel poles marking the wall line, a teenage girl reading an information panel"],
  ["15_east_side_gallery", "2025:07:02 12:00:00", 52.505, 13.4397, "East Side Gallery mural section of the Berlin Wall, colourful painted concrete, bright noon"],
  ["16_tempelhof_kart", "2025:07:03 16:00:00", 52.4736, 13.4017, "wide empty runway at Tempelhofer Feld, a small boy on a pedal go-kart racing away, huge sky"],
  ["17_astronomical_clock", "2025:07:04 15:00:00", 50.087, 14.4208, "Prague Astronomical Clock on the Old Town Hall tower with a crowd looking up, afternoon"],
  ["18_charles_bridge", "2025:07:04 21:00:00", 50.0865, 14.4114, "Charles Bridge in Prague at sunset with statues in silhouette and the castle beyond, golden sky"],
  ["19_prague_castle", "2025:07:05 10:30:00", 50.0909, 14.4005, "St Vitus Cathedral facade inside Prague Castle, gothic towers, morning light, kids looking up"],
  ["20_schonbrunn", "2025:07:07 09:30:00", 48.1845, 16.3122, "Schonbrunn Palace gardens seen from the Gloriette hill, yellow palace in the distance, early morning"],
  ["21_sachertorte", "2025:07:07 16:30:00", 48.2038, 16.3697, "two slices of Sachertorte with whipped cream and two hot chocolates on a marble cafe table at Cafe Sacher in Vienna"],
  ["22_grand_canal", "2025:07:08 11:00:00", 45.438, 12.334, "view from a vaporetto on the Grand Canal in Venice, palazzos and the Rialto Bridge ahead, bright morning"],
  ["23_burano", "2025:07:09 14:00:00", 45.4853, 12.4167, "painted houses of Burano in pink, blue and yellow along a small canal, laundry lines, a girl holding a glass pendant"],
  ["24_duomo_climb", "2025:07:10 16:30:00", 43.7731, 11.256, "view from the top of Brunelleschi's dome over Florence's terracotta rooftops in intense afternoon heat haze"],
  ["25_piazzale_sunset", "2025:07:11 20:45:00", 43.7629, 11.265, "sunset over Florence from Piazzale Michelangelo, the Duomo and Arno river, crowd sitting on the steps"],
  ["26_siena_campo", "2025:07:12 12:00:00", 43.3188, 11.3317, "Piazza del Campo in Siena at noon, shell shaped brick square and the Torre del Mangia, a boy with a bandaged knee"],
  ["27_colosseum_underground", "2025:07/13 15:30:00".replace("/", ":"), 41.8902, 12.4922, "underground corridors of the Colosseum in Rome on a guided tour, ancient brick arches, shafts of hot sunlight"],
  ["28_trevi", "2025:07:15 10:30:00", 41.9009, 12.4833, "Trevi Fountain in Rome in the morning crowd, a child tossing a coin over the shoulder seen from behind"],
  ["29_barceloneta_swim", "2025:07:16 19:30:00", 41.3784, 2.1925, "Barceloneta beach at golden hour, two kids running into the Mediterranean seen from behind, city skyline"],
  ["30_sagrada_familia", "2025:07:17 09:30:00", 41.4036, 2.1744, "Sagrada Familia nativity facade with construction cranes, morning light, looking up"],
  ["31_park_guell", "2025:07:17 13:30:00", 41.4145, 2.1527, "mosaic serpentine bench at Park Guell in Barcelona with the city and sea beyond, midday"],
  ["32_montserrat", "2025:07:18 13:00:00", 41.5933, 1.8378, "Montserrat monastery beneath jagged grey rock peaks, rack railway station, clear sky"],
];

function dms(v) {
  return piexif.GPSHelper.degToDmsRational(Math.abs(v));
}

await fs.mkdir(OUT, { recursive: true });
for (const [name, when, lat, lng, prompt] of SHOTS) {
  const file = path.join(OUT, `${name}.jpg`);
  try {
    await fs.access(file);
    console.log("skip", name);
    continue;
  } catch {}
  let png;
  try {
    const r = await generateImage({ model: MODEL, prompt: STYLE + prompt, aspectRatio: "4:3" });
    png = r.image.uint8Array;
  } catch (e) {
    console.log("retry without aspect ratio:", name, e.message?.slice(0, 120));
    const r = await generateImage({ model: MODEL, prompt: STYLE + prompt });
    png = r.image.uint8Array;
  }
  const jpg = await sharp(png).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
  const zeroth = { [piexif.ImageIFD.Make]: "Apple", [piexif.ImageIFD.Model]: "iPhone 15 Pro", [piexif.ImageIFD.DateTime]: when, [piexif.ImageIFD.Software]: "18.5" };
  const exif = { [piexif.ExifIFD.DateTimeOriginal]: when, [piexif.ExifIFD.DateTimeDigitized]: when };
  const gps = {
    [piexif.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
    [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? "N" : "S",
    [piexif.GPSIFD.GPSLatitude]: dms(lat),
    [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? "E" : "W",
    [piexif.GPSIFD.GPSLongitude]: dms(lng),
  };
  const withExif = piexif.insert(piexif.dump({ "0th": zeroth, Exif: exif, GPS: gps }), jpg.toString("binary"));
  await fs.writeFile(file, Buffer.from(withExif, "binary"));
  console.log("wrote", name, jpg.length);
}
console.log("done");

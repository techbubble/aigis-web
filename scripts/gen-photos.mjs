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
  ["33_heathrow_arrivals", "2025:06:21 08:05:00", 51.4700, -0.4543, "Heathrow arrivals hall, family of four with backpacks waiting at a baggage carousel, early morning, one tired nine year old sitting on a trolley"],
  ["34_bloomsbury_flat", "2025:06:21 12:40:00", 51.5225, -0.1257, "small London flat living room with backpacks dumped on the floor, sash window onto a leafy Bloomsbury square, kettle on"],
  ["35_st_james_park", "2025:06:22 13:10:00", 51.5027, -0.1348, "pelicans on the lake in St James's Park, two children watching from the path, London Eye in the far distance"],
  ["36_dishoom", "2025:06:22 19:35:00", 51.5128, -0.1239, "table at an Indian restaurant in Covent Garden with black daal, naan, grilled chicken and mango lassi, warm dim light"],
  ["37_kings_chapel", "2025:06:23 14:10:00", 52.2043, 0.1165, "fan vaulted ceiling of King's College Chapel in Cambridge, a twelve year old girl looking straight up, stained glass"],
  ["38_eurostar", "2025:06:24 10:05:00", 51.5309, -0.1264, "Eurostar platform at St Pancras station, family with suitcases boarding a blue and yellow train, Victorian iron roof"],
  ["39_falafel", "2025:06:24 14:35:00", 48.8572, 2.3598, "overstuffed falafel pita held up on Rue des Rosiers in Le Marais, Paris street and shop fronts behind"],
  ["40_mona_lisa", "2025:06:25 10:20:00", 48.8603, 2.3376, "crowd with phones raised in front of the Mona Lisa at the Louvre, a boy on his father's shoulders"],
  ["41_tuileries_picnic", "2025:06:25 12:50:00", 48.8635, 2.3275, "picnic lunch on green metal chairs around a fountain in the Tuileries garden, baguette and cheese, hot bright day"],
  ["42_orsay_clock", "2025:06:26 14:40:00", 48.8600, 2.3266, "the giant clock window inside Musee d'Orsay with Paris seen through it, family silhouettes"],
  ["43_pharmacy", "2025:06:26 19:25:00", 48.8597, 2.3482, "green neon pharmacy cross on Rue de Rivoli at dusk, a man walking in with a small boy in his arms"],
  ["44_versailles_gardens", "2025:06:27 15:05:00", 48.8035, 2.1138, "Versailles gardens from the palace terrace, fountains and the Grand Canal in heat haze, a girl in a sun hat"],
  ["45_houseboat", "2025:06/28 14:10:00".replace("/", ":"), 52.3675, 4.8842, "houseboat moored on Prinsengracht in Amsterdam, two kids on the deck, bicycles on the quay, gabled houses"],
  ["46_anne_frank_house", "2025:06:29 09:05:00", 52.3752, 4.8840, "quiet queue along the Prinsengracht canal outside the Anne Frank House, morning light, church tower"],
  ["47_vondelpark", "2025:06:29 12:40:00", 52.3579, 4.8686, "picnic on the grass in Vondelpark, a girl and a boy throwing a frisbee, bicycles passing"],
  ["48_stroopwafel", "2025:06:29 18:30:00", 52.3731, 4.8926, "fresh stroopwafels at a market stall, caramel stretching between two halves held by a child"],
  ["49_clog_workshop", "2025:06:30 13:05:00", 52.4739, 4.8168, "clog workshop at Zaanse Schans, a nine year old boy sitting inside a giant yellow wooden clog"],
  ["50_ice_train", "2025:07:01 11:20:00", 52.3759, 9.7320, "ICE train interior, two kids asleep across the seats, flat green German countryside blurred through the window"],
  ["51_reichstag_dome", "2025:07:01 21:05:00", 52.5186, 13.3762, "glass dome of the Reichstag at dusk, spiral ramp, people walking up, Berlin skyline"],
  ["52_currywurst", "2025:07:02 13:05:00", 52.5398, 13.4113, "currywurst and fries in paper trays at Konnopke's Imbiss under the elevated U-Bahn tracks in Berlin"],
  ["53_museum_island", "2025:07:03 11:00:00", 52.5203, 13.3978, "Neues Museum colonnade on Museum Island in Berlin, family on the steps, morning"],
  ["54_prater_garten", "2025:07:03 19:30:00", 52.5399, 13.4098, "beer garden under chestnut trees with long wooden tables, kids with lemonade, string lights coming on"],
  ["55_elbe_train", "2025:07:04 10:35:00", 50.9100, 14.0500, "train window view along the Elbe river, sandstone cliffs of Saxon Switzerland, morning mist"],
  ["56_trdelnik", "2025:07:04 17:00:00", 50.0875, 14.4213, "trdelnik pastries rolling over coals at a Prague street stall, two kids waiting with coins"],
  ["57_golden_lane", "2025:07:05 11:30:00", 50.0921, 14.4036, "tiny painted houses of Golden Lane inside Prague Castle, a girl ducking through a low blue door"],
  ["58_vltava_boat", "2025:07:05 15:30:00", 50.0834, 14.4128, "small boat on the Vltava passing under Charles Bridge, swans, afternoon sun"],
  ["59_naschmarkt", "2025:07:06 18:30:00", 48.1986, 16.3634, "Naschmarkt in Vienna, stalls piled with olives, dried fruit and spices, evening crowd"],
  ["60_bruegel_room", "2025:07:07 14:00:00", 48.2038, 16.3617, "a twelve year old girl standing alone before Bruegel's Hunters in the Snow in a museum gallery, parquet floor"],
  ["61_st_marks", "2025:07:08 14:15:00", 45.4345, 12.3389, "St Mark's Basilica facade and Piazza San Marco under intense sun, pigeons, a boy with a gelato"],
  ["62_murano_glass", "2025:07:09 11:30:00", 45.4585, 12.3528, "glassblower shaping glowing molten glass in a Murano workshop, two children watching from behind a rope"],
  ["63_acqua_alta", "2025:07:09 23:10:00", 45.4452, 12.3345, "water creeping over a Venice doorstep at night, lamplight reflections on a flooded alley"],
  ["64_birth_of_venus", "2025:07:11 09:00:00", 43.7678, 11.2553, "Botticelli's Birth of Venus with a small morning crowd in the Uffizi, a boy pointing"],
  ["65_mercato_centrale", "2025:07:11 12:30:00", 43.7765, 11.2533, "family eating at a counter in the Mercato Centrale food hall in Florence, pasta plates, iron columns"],
  ["66_david", "2025:07:11 16:15:00", 43.7768, 11.2589, "the long gallery hall of the Accademia in Florence, visitors walking toward the lit tribune at the far end under the skylight, marble statue silhouetted in the distance, a girl with an audio guide"],
  ["67_siena_duomo", "2025:07:12 14:00:00", 43.3176, 11.3289, "striped black and white marble columns inside Siena Cathedral, a girl looking up"],
  ["68_birthday_dinner", "2025:07:12 20:30:00", 43.7725, 11.2452, "birthday dinner in a Florentine trattoria, bistecca on the table, a candle in a dessert, a family of four cheering"],
  ["69_roman_forum", "2025:07:13 17:00:00", 41.8925, 12.4853, "Roman Forum ruins in evening heat, columns and arches, two kids sitting on an ancient wall"],
  ["70_st_peters", "2025:07:14 11:30:00", 41.9022, 12.4567, "St Peter's Square packed with Jubilee pilgrims, colonnade and obelisk, blazing sun"],
  ["71_trastevere", "2025:07:14 20:40:00", 41.8893, 12.4694, "Trastevere lane at night with outdoor tables, plates of carbonara, string lights, ivy on the walls"],
  ["72_apollo_daphne", "2025:07:15 09:30:00", 41.9142, 12.4922, "Bernini's Apollo and Daphne marble sculpture in the Borghese Gallery, soft gallery light"],
  ["73_pantheon", "2025:07:15 12:00:00", 41.8986, 12.4769, "beam of light from the Pantheon oculus hitting the marble floor, crowd looking up"],
  ["74_spanish_steps", "2025:07:15 17:30:00", 41.9059, 12.4823, "Spanish Steps in late afternoon, two kids with gelato cones, flowers along the steps"],
  ["75_plane_window", "2025:07:16 11:05:00", 41.8003, 12.2389, "airplane window view just after takeoff from Rome Fiumicino, wing and coastline, a child's hand on the window"],
  ["76_gracia_square", "2025:07:16 15:00:00", 41.4036, 2.1561, "small square in the Gracia neighbourhood of Barcelona, plane trees, cafe tables, kids chasing pigeons"],
  ["77_tapas_blai", "2025:07:17 20:00:00", 41.3727, 2.1605, "pintxos and tapas lined up on a bar counter on Carrer de Blai, evening crowd, a girl ordering"],
  ["78_montserrat_choir", "2025:07:18 13:00:00", 41.5934, 1.8385, "interior of the Montserrat basilica during the boys choir, candles, gold altar, hushed crowd"],
  ["79_boqueria", "2025:07:18 19:30:00", 41.3817, 2.1719, "rainbow rows of fruit juice cups at La Boqueria market in Barcelona, two kids choosing"],
  ["80_el_prat", "2025:07:19 09:30:00", 41.2974, 2.0833, "departures hall at Barcelona El Prat airport, family of four with backpacks and boarding passes, tired smiles"],
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

export type Sample = {
  id: string;
  title: string;
  tagline: string;
  blurb: string;
  files: string[];
  questions: string[];
  accent: string;
  theme: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "europe-vacation",
    title: "A Family Summer in Europe",
    tagline: "A camera roll, nothing else",
    blurb: "Thirty-two phone photos from four weeks and ten cities. Where and when come from the pictures; Muse Spark writes the captions and the map tells the story.",
    files: ["photos/01_british_museum.jpg", "photos/02_changing_guard.jpg", "photos/03_london_eye.jpg", "photos/04_cambridge_punt.jpg", "photos/05_notre_dame.jpg", "photos/06_louvre_morning.jpg", "photos/07_arc_de_triomphe.jpg", "photos/08_eiffel_summit.jpg", "photos/09_versailles_mirrors.jpg", "photos/10_amsterdam_cruise.jpg", "photos/11_night_watch.jpg", "photos/12_zaanse_schans.jpg", "photos/13_brandenburg_dusk.jpg", "photos/14_wall_memorial.jpg", "photos/15_east_side_gallery.jpg", "photos/16_tempelhof_kart.jpg", "photos/17_astronomical_clock.jpg", "photos/18_charles_bridge.jpg", "photos/19_prague_castle.jpg", "photos/20_schonbrunn.jpg", "photos/21_sachertorte.jpg", "photos/22_grand_canal.jpg", "photos/23_burano.jpg", "photos/24_duomo_climb.jpg", "photos/25_piazzale_sunset.jpg", "photos/26_siena_campo.jpg", "photos/27_colosseum_underground.jpg", "photos/28_trevi.jpg", "photos/29_barceloneta_swim.jpg", "photos/30_sagrada_familia.jpg", "photos/31_park_guell.jpg", "photos/32_montserrat.jpg"],
    questions: [
      "Replay the trip from London to Barcelona",
      "Which cities did we spend the most days in?",
      "Show me every photo taken at sunset or dusk",
      "Where were the kids in the photos?",
    ],
    accent: "#f59e0b",
    theme: "midnight",
  },
  {
    id: "western-settlement",
    title: "Settlement of the American West",
    tagline: "Historical chronicle + towns table",
    blurb: "Ninety years of exploration, trails, gold and railroads extracted from a classroom chronicle and a table of towns and forts.",
    files: ["chronicle.md", "towns_and_forts.csv"],
    questions: [
      "Animate the westward movement from 1803 to 1893",
      "Which events followed the discovery of gold at Sutter's Mill?",
      "Where did the Indian Wars cluster and when?",
      "What was founded within two years of the railroad?",
    ],
    accent: "#d97706",
    theme: "parchment",
  },
  {
    id: "renaissance-art",
    title: "The Renaissance, City by City",
    tagline: "Catalogue of works + essay",
    blurb: "Two centuries of masterpieces plotted where they were made. See the center of gravity move from Florence to Rome to Venice and beyond.",
    files: ["works.csv", "essay.md"],
    questions: [
      "Show how the center of activity moved over time",
      "What happened in Rome between 1500 and 1530?",
      "Which political events coincided with artists leaving a city?",
      "Where was Dürer and when?",
    ],
    accent: "#a855f7",
    theme: "fresco",
  },
  {
    id: "sports-sponsorships",
    title: "Voltic: A Decade of Sports Sponsorships",
    tagline: "Business ledger + strategy memo",
    blurb: "A fictional drink brand's 300+ event sponsorships worldwide from 2015 to 2025, with a strategy memo. Find the pivots, the outliers and the cause and effect.",
    files: ["sponsorships.csv", "strategy_memo.md"],
    questions: [
      "Animate sponsorship spend by region over the decade",
      "Which deals were outliers and what explains them?",
      "Did sampling events precede title sponsorships in new markets?",
      "What happened to Latin America spend in 2023?",
    ],
    accent: "#22d3ee",
    theme: "neon",
  },
];

export function sampleById(id: string) {
  return SAMPLES.find((s) => s.id === id) ?? null;
}

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
    tagline: "Camera roll + travel journal + expenses",
    blurb: "Eighty phone photos, a parent's day-by-day journal and the expense sheet from four weeks across ten cities. Positions and times come from the pictures, AIGIS writes the captions and reads the journal, and the map replays the trip.",
    files: ["photos/01_british_museum.jpg", "photos/02_changing_guard.jpg", "photos/03_london_eye.jpg", "photos/04_cambridge_punt.jpg", "photos/05_notre_dame.jpg", "photos/06_louvre_morning.jpg", "photos/07_arc_de_triomphe.jpg", "photos/08_eiffel_summit.jpg", "photos/09_versailles_mirrors.jpg", "photos/10_amsterdam_cruise.jpg", "photos/11_night_watch.jpg", "photos/12_zaanse_schans.jpg", "photos/13_brandenburg_dusk.jpg", "photos/14_wall_memorial.jpg", "photos/15_east_side_gallery.jpg", "photos/16_tempelhof_kart.jpg", "photos/17_astronomical_clock.jpg", "photos/18_charles_bridge.jpg", "photos/19_prague_castle.jpg", "photos/20_schonbrunn.jpg", "photos/21_sachertorte.jpg", "photos/22_grand_canal.jpg", "photos/23_burano.jpg", "photos/24_duomo_climb.jpg", "photos/25_piazzale_sunset.jpg", "photos/26_siena_campo.jpg", "photos/27_colosseum_underground.jpg", "photos/28_trevi.jpg", "photos/29_barceloneta_swim.jpg", "photos/30_sagrada_familia.jpg", "photos/31_park_guell.jpg", "photos/32_montserrat.jpg", "photos/33_heathrow_arrivals.jpg", "photos/34_bloomsbury_flat.jpg", "photos/35_st_james_park.jpg", "photos/36_dishoom.jpg", "photos/37_kings_chapel.jpg", "photos/38_eurostar.jpg", "photos/39_falafel.jpg", "photos/40_mona_lisa.jpg", "photos/41_tuileries_picnic.jpg", "photos/42_orsay_clock.jpg", "photos/43_pharmacy.jpg", "photos/44_versailles_gardens.jpg", "photos/45_houseboat.jpg", "photos/46_anne_frank_house.jpg", "photos/47_vondelpark.jpg", "photos/48_stroopwafel.jpg", "photos/49_clog_workshop.jpg", "photos/50_ice_train.jpg", "photos/51_reichstag_dome.jpg", "photos/52_currywurst.jpg", "photos/53_museum_island.jpg", "photos/54_prater_garten.jpg", "photos/55_elbe_train.jpg", "photos/56_trdelnik.jpg", "photos/57_golden_lane.jpg", "photos/58_vltava_boat.jpg", "photos/59_naschmarkt.jpg", "photos/60_bruegel_room.jpg", "photos/61_st_marks.jpg", "photos/62_murano_glass.jpg", "photos/63_acqua_alta.jpg", "photos/64_birth_of_venus.jpg", "photos/65_mercato_centrale.jpg", "photos/66_david.jpg", "photos/67_siena_duomo.jpg", "photos/68_birthday_dinner.jpg", "photos/69_roman_forum.jpg", "photos/70_st_peters.jpg", "photos/71_trastevere.jpg", "photos/72_apollo_daphne.jpg", "photos/73_pantheon.jpg", "photos/74_spanish_steps.jpg", "photos/75_plane_window.jpg", "photos/76_gracia_square.jpg", "photos/77_tapas_blai.jpg", "photos/78_montserrat_choir.jpg", "photos/79_boqueria.jpg", "photos/80_el_prat.jpg", "journal.md", "expenses.csv"],
    questions: [
      "Replay the trip from London to Barcelona",
      "Which city cost the most and why?",
      "What went wrong on this trip?",
      "Show me every photo taken at sunset or dusk",
    ],
    accent: "#f59e0b",
    theme: "midnight",
  },
  {
    id: "eras-tour",
    title: "The Eras Tour, Night by Night",
    tagline: "Show ledger + tour notes",
    blurb: "All 149 shows of the highest-grossing tour ever, with attendance per night and the incidents, records and releases around them. Watch it circle the world twice.",
    files: ["shows.csv", "tour_notes.md"],
    questions: [
      "Replay the whole tour from Glendale to Vancouver",
      "Which shows were canceled or postponed and why?",
      "Where were the biggest crowds?",
      "What happened in the week before the London shows?",
    ],
    accent: "#f472b6",
    theme: "midnight",
  },
  {
    id: "renaissance-art",
    title: "The Renaissance, City by City",
    tagline: "Catalog of works + essay",
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

export type Sample = {
  id: string;
  title: string;
  tagline: string;
  blurb: string;
  files: string[];
  // What the files are, in words a visitor reads on the landing page.
  sources: { label: string; kind: "table" | "pdf" }[];
  questions: string[];
  accent: string;
  theme: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "housing-markets",
    title: "U.S. Housing Markets",
    tagline: "Freddie Mac index + Freddie Mac and FHFA research",
    blurb: "The Freddie Mac House Price Index for 185 metros, quarterly since 2019, read together with three Freddie Mac Multifamily Outlooks and the FHFA quarterly report. Select any window and AIGIS tells you which markets turned, by how much, and what the research and outside sources say about why.",
    files: ["freddie_mac_hpi_metros.csv", "freddie_mac_multifamily_outlook_2024.pdf", "freddie_mac_multifamily_midyear_outlook_2024.pdf", "freddie_mac_multifamily_outlook_2025.pdf", "fhfa_house_price_index_report_2026q2.pdf"],
    sources: [
      { label: "Freddie Mac House Price Index, 185 metros, quarterly 2019 to 2026", kind: "table" },
      { label: "Freddie Mac Multifamily Outlook 2024", kind: "pdf" },
      { label: "Freddie Mac Multifamily Midyear Outlook 2024", kind: "pdf" },
      { label: "Freddie Mac Multifamily Outlook 2025", kind: "pdf" },
      { label: "FHFA House Price Index Report, 2026 Q2", kind: "pdf" },
    ],
    questions: [
      "Which metros fell the most in this window, and what do they have in common?",
      "Did Sun Belt prices turn before or after the rest of the country?",
      "What did mortgage rates do over this period?",
      "Show the metros where the research expected supply to peak",
    ],
    accent: "#38bdf8",
    theme: "arctic",
  },
];

export function sampleById(id: string) {
  return SAMPLES.find((s) => s.id === id) ?? null;
}

// Categorical palette tuned for a dark basemap.
export const PALETTE = [
  "#38bdf8", // sky
  "#f472b6", // pink
  "#fbbf24", // amber
  "#34d399", // emerald
  "#a78bfa", // violet
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#f87171", // red
  "#a3e635", // lime
  "#e879f9", // fuchsia
  "#facc15", // yellow
  "#60a5fa", // blue
  "#2dd4bf", // teal
  "#fb7185", // rose
  "#c084fc", // purple
  "#4ade80", // green
];

export function categoryColors(categories: { name: string; count: number }[]): Record<string, string> {
  const out: Record<string, string> = {};
  categories.forEach((c, i) => {
    out[c.name] = PALETTE[i % PALETTE.length];
  });
  return out;
}

export const OTHER_COLOR = "#94a3b8";

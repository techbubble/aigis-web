"use client";

// Three documents on the left with the places and dates inside them lit up
// one after another; on the right an empty map with a blank timeline. The
// point: the facts are there, the map never gets made.
const DOCS: { kind: string; lines: { w: number; hit?: "place" | "time" }[] }[] = [
  { kind: "report.pdf", lines: [{ w: 92 }, { w: 60, hit: "time" }, { w: 84 }, { w: 48, hit: "place" }, { w: 76 }] },
  { kind: "ledger.csv", lines: [{ w: 88, hit: "time" }, { w: 70 }, { w: 64, hit: "place" }, { w: 80 }, { w: 56, hit: "place" }] },
  { kind: "journal.md", lines: [{ w: 72 }, { w: 90, hit: "place" }, { w: 58, hit: "time" }, { w: 82 }, { w: 66 }] },
];

export function ProblemFigure() {
  let k = 0;
  return (
    <svg viewBox="0 0 560 360" className="w-full" role="img" aria-label="Documents with places and dates highlighted; an empty map beside them">
      <defs>
        <pattern id="pgrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,0.07)" />
        </pattern>
      </defs>
      {DOCS.map((d, i) => (
        <g key={d.kind} transform={`translate(${18 + i * 20} ${24 + i * 36})`} className="pf-doc" style={{ animationDelay: `${i * 0.15}s` }}>
          <rect width="200" height="190" rx="10" fill="var(--ink-2)" stroke="var(--line)" />
          <text x="14" y="24" fontFamily="var(--font-geist-mono)" fontSize="10" fill="var(--dim)">
            {d.kind}
          </text>
          {d.lines.map((l, j) => {
            const y = 44 + j * 26;
            const idx = l.hit ? k++ : -1;
            return (
              <g key={j}>
                <rect x="14" y={y} width={(172 * l.w) / 100} height="10" rx="5" fill="rgba(255,255,255,0.12)" />
                {l.hit && (
                  <g className="pf-hit" style={{ animationDelay: `${0.8 + idx * 0.55}s` }}>
                    <rect x={14 + (172 * l.w) / 100 - 58} y={y - 3} width="58" height="16" rx="8" fill={l.hit === "place" ? "var(--glow)" : "var(--glow-2)"} />
                    <text x={14 + (172 * l.w) / 100 - 29} y={y + 8.5} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-geist-mono)">
                      {l.hit === "place" ? "PLACE" : "DATE"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      ))}

      {/* The map that never gets made */}
      <g transform="translate(300 24)">
        <rect width="242" height="230" rx="12" fill="var(--ink-2)" stroke="var(--line)" />
        <rect x="1" y="1" width="240" height="228" rx="12" fill="url(#pgrid)" />
        <path d="M30 160 C 60 120, 90 150, 120 110 S 190 90, 215 60" fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
        <path d="M40 60 C 70 70, 80 100, 110 130 S 170 170, 200 190" fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
        <text x="121" y="128" textAnchor="middle" fontSize="54" fontWeight="600" fill="var(--dim)" className="pf-q">
          ?
        </text>
        <text x="121" y="212" textAnchor="middle" fontSize="11" fontFamily="var(--font-geist-mono)" fill="var(--dim)" letterSpacing="2">
          NO MAP
        </text>
      </g>
      {/* A flat timeline */}
      <g transform="translate(300 290)">
        <line x1="0" y1="20" x2="242" y2="20" stroke="var(--line)" strokeWidth="2" />
        {[0, 60, 121, 182, 242].map((x) => (
          <line key={x} x1={x} y1="14" x2={x} y2="26" stroke="var(--line)" />
        ))}
        <text x="0" y="48" fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
          2019
        </text>
        <text x="242" y="48" textAnchor="end" fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
          2026
        </text>
        <text x="121" y="48" textAnchor="middle" fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--dim)" letterSpacing="2">
          NOTHING ON IT
        </text>
      </g>
      {/* Arrows that never arrive */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${236 + i * 2} ${118 + i * 36} C 262 ${118 + i * 36}, 270 ${140}, 296 ${140}`} fill="none" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="3 5" className="pf-arrow" />
      ))}
    </svg>
  );
}

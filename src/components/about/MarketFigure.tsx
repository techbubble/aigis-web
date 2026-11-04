"use client";

// Two circles: the small one is today's market, trained GIS users; the
// large one grows around it, the people who hold the documents. Audience
// chips light up around the rim one by one.
const AUDIENCES = ["Newsrooms", "Supply chain", "Insurance", "Public health", "Researchers", "Historians", "Tour operators", "Brands", "Families"];

export function MarketFigure() {
  const cx = 280;
  const cy = 190;
  const R = 150;
  return (
    <svg viewBox="0 0 560 380" className="w-full" role="img" aria-label="A small circle of GIS specialists inside a growing circle of everyone with documents">
      <defs>
        <radialGradient id="mfOuter">
          <stop offset="0.55" stopColor="var(--glow)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--glow)" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#mfOuter)" stroke="var(--glow)" strokeWidth="1.5" strokeDasharray="4 6" className="mf-outer" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <text x={cx} y={cy - R + 62} textAnchor="middle" fontSize="11" fontFamily="var(--font-geist-mono)" fill="var(--glow)" letterSpacing="2" className="mf-outer-label">
        EVERYONE WITH DOCUMENTS
      </text>

      <circle cx={cx} cy={cy} r="46" fill="var(--ink-2)" stroke="var(--line)" strokeWidth="1.5" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--fog)">
        GIS specialists
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
        today&apos;s market
      </text>
      <text x={cx} y={cy + 66} textAnchor="middle" fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--mist)">
        ~$100B/yr · 11-13% growth
      </text>

      {AUDIENCES.map((a, i) => {
        const ang = -Math.PI / 2 + (i / AUDIENCES.length) * Math.PI * 2;
        const x = cx + Math.cos(ang) * (R + 2);
        const y = cy + Math.sin(ang) * (R + 2);
        const w = a.length * 6.4 + 22;
        return (
          <g key={a} transform={`translate(${x} ${y})`} className="mf-chip" style={{ animationDelay: `${0.9 + i * 0.28}s` }}>
            <rect x={-w / 2} y="-11" width={w} height="22" rx="11" fill="var(--ink)" stroke="var(--glow)" />
            <text y="4" textAnchor="middle" fontSize="10.5" fontWeight="500" fill="var(--fog)">
              {a}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

"use client";

// The pipeline, animated on a loop: files enter, extraction turns them into
// event rows, the rows land on a map as markers while the timeline cursor
// sweeps, then a question arrives and the map focuses on the answer.
const FILES = ["shows.csv", "notes.md", "IMG_2291.jpg", "memo.pdf"];
const EVENTS = [
  { x: 72, y: 70, c: "var(--glow)" },
  { x: 118, y: 96, c: "var(--glow)" },
  { x: 160, y: 60, c: "#f472b6" },
  { x: 96, y: 128, c: "#facc15" },
  { x: 186, y: 112, c: "var(--glow)" },
  { x: 140, y: 146, c: "#f472b6" },
  { x: 48, y: 110, c: "#facc15" },
  { x: 208, y: 150, c: "var(--glow)" },
];

export function SolutionFigure() {
  return (
    <svg viewBox="0 0 560 360" className="w-full" role="img" aria-label="Files flow through extraction into events that land on an animated map, then a question focuses the map">
      <defs>
        <linearGradient id="sfModel" x1="0" x2="1">
          <stop offset="0" stopColor="var(--glow)" />
          <stop offset="1" stopColor="var(--glow-2)" />
        </linearGradient>
        <pattern id="sgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,0.08)" />
        </pattern>
      </defs>

      {/* Files */}
      <g transform="translate(10 40)">
        {FILES.map((f, i) => (
          <g key={f} transform={`translate(0 ${i * 40})`}>
            <rect width="112" height="30" rx="7" fill="var(--ink-2)" stroke="var(--line)" />
            <text x="12" y="19" fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--mist)">
              {f}
            </text>
            <circle r="4" fill="var(--glow)" opacity="0">
              <animateMotion path={`M 112 15 C 150 15, 150 ${75 - i * 40}, 186 ${75 - i * 40}`} dur="9s" begin={`${i * 0.6}s`} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.1;1" calcMode="linear" />
              <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.01;0.09;0.1;1" dur="9s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </g>

      {/* Models */}
      <g transform="translate(196 72)">
        <rect width="104" height="96" rx="14" fill="var(--ink-2)" stroke="url(#sfModel)" strokeWidth="1.5" />
        <circle cx="52" cy="40" r="16" fill="none" stroke="url(#sfModel)" strokeWidth="1.5" className="sf-spin" style={{ transformOrigin: "52px 40px" }} strokeDasharray="60 40" />
        <circle cx="52" cy="40" r="5" fill="url(#sfModel)" />
        <text x="52" y="74" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--fog)" letterSpacing="1">
          EXTRACT
        </text>
        <text x="52" y="87" textAnchor="middle" fontSize="8" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
          read · caption · answer
        </text>
      </g>

      {/* Event rows */}
      <g transform="translate(196 186)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(0 ${i * 22})`} className="sf-row" style={{ animationDelay: `${1.2 + i * 0.5}s` }}>
            <rect width="104" height="16" rx="4" fill="var(--ink)" stroke="var(--line)" />
            <rect x="6" y="5" width="28" height="6" rx="3" fill="var(--glow)" />
            <rect x="38" y="5" width="22" height="6" rx="3" fill="var(--glow-2)" />
            <rect x="64" y="5" width="18" height="6" rx="3" fill="#facc15" />
            <rect x="86" y="5" width="12" height="6" rx="3" fill="rgba(255,255,255,0.35)" />
          </g>
        ))}
        <text x="0" y="82" fontSize="8" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
          place · time · value · confidence
        </text>
      </g>

      {/* Map */}
      <g transform="translate(320 28)">
        <rect width="230" height="190" rx="12" fill="var(--ink-2)" stroke="var(--line)" />
        <rect x="1" y="1" width="228" height="188" rx="12" fill="url(#sgrid)" />
        <path d="M18 120 C 50 80, 70 150, 110 100 S 170 60, 212 90 L 212 176 L 18 176 Z" fill="rgba(255,255,255,0.05)" />
        <path d="M18 120 C 50 80, 70 150, 110 100 S 170 60, 212 90" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        {EVENTS.map((e, i) => (
          <g key={i} transform={`translate(${e.x} ${e.y})`} className="sf-marker" style={{ animationDelay: `${2 + i * 0.35}s` }}>
            <circle r="9" fill={e.c} opacity="0.25" className="sf-halo" style={{ animationDelay: `${2 + i * 0.35}s` }} />
            <circle r="4.5" fill={e.c} stroke="var(--ink)" strokeWidth="1.2" />
          </g>
        ))}
        {/* Focus ring from the question */}
        <rect x="92" y="80" width="112" height="88" rx="10" fill="none" stroke="var(--glow)" strokeWidth="1.5" strokeDasharray="6 4" className="sf-focus" />
      </g>

      {/* Timeline */}
      <g transform="translate(320 232)">
        <line x1="0" y1="10" x2="230" y2="10" stroke="var(--line)" strokeWidth="2" />
        {EVENTS.map((e, i) => (
          <line key={i} x1={14 + i * 29} y1="4" x2={14 + i * 29} y2="16" stroke={e.c} strokeWidth="2" className="sf-tick" style={{ animationDelay: `${2 + i * 0.35}s` }} />
        ))}
        <g className="sf-cursor">
          <line x1="0" y1="-4" x2="0" y2="24" stroke="var(--fog)" strokeWidth="2" />
          <rect x="-3" y="-8" width="6" height="6" rx="1" fill="var(--fog)" />
        </g>
      </g>

      {/* Question */}
      <g transform="translate(320 274)" className="sf-ask">
        <rect width="230" height="30" rx="15" fill="var(--fog)" />
        <text x="14" y="19" fontSize="10" fill="var(--ink)" fontWeight="500">
          Which shows were postponed, and why?
        </text>
      </g>
      <g transform="translate(320 312)" className="sf-answer">
        <rect width="230" height="30" rx="8" fill="var(--ink-2)" stroke="var(--line)" />
        <text x="12" y="19" fontSize="9.5" fill="var(--mist)">
          Two: Buenos Aires (storm), Rio de Janeiro (heat).
        </text>
      </g>
    </svg>
  );
}

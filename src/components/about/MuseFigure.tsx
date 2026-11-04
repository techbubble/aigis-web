"use client";

import type { ReactNode } from "react";

// Every Muse call in the product, one card each: a looping pictogram of what
// goes in and what comes out, the model that does it, and one line on how.
const MONO = "var(--font-geist-mono)";

function Chip({ x, y, w, c, begin, label }: { x: number; y: number; w: number; c: string; begin: string; label?: string }) {
  return (
    <g opacity="0">
      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.15;0.25;0.9;1" dur="6s" begin={begin} repeatCount="indefinite" />
      <rect x={x} y={y} width={w} height="10" rx="5" fill={c} />
      {label && (
        <text x={x + w / 2} y={y + 7.5} textAnchor="middle" fontSize="6" fontFamily={MONO} fontWeight="600" fill="var(--ink)">
          {label}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <path d={`M${x1} ${y} H${x2} l-3 -3 M${x2} ${y} l-3 3`} fill="none" stroke="var(--dim)" strokeWidth="1" strokeDasharray="2 2" />;
}

function Lines({ x, y, ws, c = "var(--dim)" }: { x: number; y: number; ws: number[]; c?: string }) {
  return (
    <g>
      {ws.map((w, i) => (
        <rect key={i} x={x} y={y + i * 8} width={w} height="3" rx="1.5" fill={c} opacity="0.6" />
      ))}
    </g>
  );
}

const extract = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    <rect x="4" y="10" width="44" height="60" rx="4" fill="var(--ink)" stroke="var(--line)" />
    <Lines x={10} y={18} ws={[30, 26, 32, 20, 30, 24]} />
    <rect x="10" y="33" width="26" height="5" rx="1" fill="var(--glow)" opacity="0.25">
      <animate attributeName="width" values="0;26;26;0" keyTimes="0;0.2;0.9;1" dur="6s" repeatCount="indefinite" />
    </rect>
    <Arrow x1={52} x2={66} y={40} />
    <rect x="68" y="30" width="48" height="20" rx="4" fill="var(--ink)" stroke="var(--line)" />
    <Chip x={72} y={35} w={13} c="var(--glow)" begin="0s" label="place" />
    <Chip x={87} y={35} w={11} c="var(--glow-2)" begin="0.5s" label="time" />
    <Chip x={100} y={35} w={13} c="#facc15" begin="1s" label="value" />
    <text x="92" y="62" textAnchor="middle" fontSize="5.5" fontFamily={MONO} fill="var(--dim)">
      + quote, confidence
    </text>
  </svg>
);

const vision = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    <rect x="4" y="12" width="48" height="56" rx="4" fill="var(--ink)" stroke="var(--line)" />
    <path d="M8 60 L22 38 L32 52 L40 44 L48 60 Z" fill="var(--glow)" opacity="0.35" />
    <circle cx="40" cy="26" r="5" fill="#facc15" opacity="0.8" />
    <rect x="6" y="14" width="44" height="52" rx="3" fill="var(--glow)" opacity="0">
      <animate attributeName="opacity" values="0;0.25;0;0;0" keyTimes="0;0.1;0.2;0.9;1" dur="6s" repeatCount="indefinite" />
    </rect>
    <text x="28" y="76" textAnchor="middle" fontSize="5.5" fontFamily={MONO} fill="var(--dim)">
      EXIF: where, when
    </text>
    <Arrow x1={56} x2={66} y={40} />
    {[0, 1, 2].map((i) => (
      <rect key={i} x="68" y={28 + i * 10} height="4" rx="2" fill={i === 0 ? "var(--fog)" : "var(--mist)"} width="0">
        <animate attributeName="width" values={`0;0;${[46, 40, 30][i]};${[46, 40, 30][i]};0`} keyTimes={`0;${0.2 + i * 0.1};${0.35 + i * 0.1};0.9;1`} dur="6s" repeatCount="indefinite" />
      </rect>
    ))}
    <text x="92" y="64" textAnchor="middle" fontSize="5.5" fontFamily={MONO} fill="var(--dim)">
      caption + category
    </text>
  </svg>
);

const table = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    {["Date", "City", "Cases"].map((h, i) => (
      <g key={h} transform={`translate(4 ${14 + i * 20})`}>
        <rect width="34" height="14" rx="3" fill="var(--ink)" stroke="var(--line)" />
        <text x="17" y="9.5" textAnchor="middle" fontSize="6.5" fontFamily={MONO} fill="var(--mist)">
          {h}
        </text>
      </g>
    ))}
    {["time", "place", "value"].map((h, i) => (
      <g key={h} transform={`translate(82 ${14 + i * 20})`}>
        <rect width="34" height="14" rx="3" fill="var(--ink)" stroke="var(--glow)" />
        <text x="17" y="9.5" textAnchor="middle" fontSize="6.5" fontFamily={MONO} fill="var(--glow)">
          {h}
        </text>
      </g>
    ))}
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M38 ${21 + i * 20} C 60 ${21 + i * 20}, 60 ${21 + i * 20}, 82 ${21 + i * 20}`} fill="none" stroke="var(--glow)" strokeWidth="1.2" strokeDasharray="50" strokeDashoffset="50">
        <animate attributeName="stroke-dashoffset" values="50;50;0;0;50" keyTimes={`0;${0.1 + i * 0.12};${0.3 + i * 0.12};0.9;1`} dur="6s" repeatCount="indefinite" />
      </path>
    ))}
    <text x="60" y="76" textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--dim)">
      rows convert without the model
    </text>
  </svg>
);

const geocode = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    <rect x="4" y="30" width="46" height="14" rx="7" fill="var(--ink)" stroke="var(--line)" />
    <text x="27" y="39.5" textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--mist)">
      Rogers Centre
    </text>
    <text x="27" y="56" textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--dim)">
      no match
    </text>
    <Arrow x1={54} x2={66} y={37} />
    <rect x="68" y="8" width="48" height="64" rx="4" fill="var(--ink)" stroke="var(--line)" />
    <path d="M70 50 C 80 40, 90 60, 100 44 S 112 36, 116 40 L116 70 L70 70 Z" fill="var(--fog)" opacity="0.06" />
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 -30;0 -30;0 0;0 0;0 -30" keyTimes="0;0.25;0.4;0.9;1" dur="6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.25;0.3;0.9;1" dur="6s" repeatCount="indefinite" />
      <path d="M92 36 c-5 0 -8 4 -8 8 c0 6 8 14 8 14 s8 -8 8 -14 c0 -4 -3 -8 -8 -8z" fill="var(--glow)" />
      <circle cx="92" cy="44" r="3" fill="var(--ink)" />
    </g>
    <circle cx="92" cy="58" r="3" fill="none" stroke="var(--glow)" strokeWidth="1" opacity="0">
      <animate attributeName="r" values="2;2;12" keyTimes="0;0.4;0.7" dur="6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0;0.8;0;0" keyTimes="0;0.4;0.45;0.7;1" dur="6s" repeatCount="indefinite" />
    </circle>
    <text x="92" y="66" textAnchor="middle" fontSize="5.5" fontFamily={MONO} fill="var(--dim)">
      43.64, -79.39
    </text>
  </svg>
);

const chat = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    <rect x="4" y="8" width="52" height="18" rx="9" fill="var(--fog)" />
    <text x="30" y="19.5" textAnchor="middle" fontSize="6.5" fill="var(--ink)" fontWeight="600">
      Postponed?
    </text>
    {["queryEvents", "focusMap"].map((t, i) => (
      <g key={t} opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${0.15 + i * 0.15};${0.25 + i * 0.15};0.9;1`} dur="6s" repeatCount="indefinite" />
        <rect x="4" y={36 + i * 16} width="52" height="12" rx="3" fill="var(--ink)" stroke="var(--glow-2)" />
        <text x="30" y={44.5 + i * 16} textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--glow-2)">
          {t}()
        </text>
      </g>
    ))}
    <text x="30" y="74" textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--dim)">
      cites evidence
    </text>
    <rect x="66" y="8" width="50" height="64" rx="4" fill="var(--ink)" stroke="var(--line)" />
    {[
      [78, 24],
      [96, 30],
      [84, 46],
      [104, 54],
      [92, 62],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="3" fill={i === 1 || i === 3 ? "#f472b6" : "var(--glow)"} opacity="0.9" />
    ))}
    <rect x="88" y="22" width="24" height="40" rx="4" fill="none" stroke="var(--glow)" strokeWidth="1.2" strokeDasharray="4 3" opacity="0">
      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.45;0.55;0.9;1" dur="6s" repeatCount="indefinite" />
      <animate attributeName="x" values="70;70;88;88;70" keyTimes="0;0.45;0.6;0.9;1" dur="6s" repeatCount="indefinite" />
      <animate attributeName="width" values="42;42;24;24;42" keyTimes="0;0.45;0.6;0.9;1" dur="6s" repeatCount="indefinite" />
    </rect>
  </svg>
);

const design = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    <rect x="4" y="30" width="46" height="14" rx="7" fill="var(--fog)" />
    <text x="27" y="39.5" textAnchor="middle" fontSize="6.5" fill="var(--ink)" fontWeight="600">
      airline poster
    </text>
    <Arrow x1={54} x2={66} y={37} />
    {["#f4e3c1", "#2b6f8f", "#c9533a", "#e9b44c", "#1e2a38"].map((c, i) => (
      <rect key={c} x={68 + i * 10} y="14" width="8" height="8" rx="2" fill={c} opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${0.15 + i * 0.06};${0.22 + i * 0.06};0.9;1`} dur="6s" repeatCount="indefinite" />
      </rect>
    ))}
    {["land", "water", "roads", "labels", "halftone", "grain"].map((k, i) => (
      <g key={k} transform={`translate(68 ${30 + i * 7})`}>
        <text x="0" y="4" fontSize="5" fontFamily={MONO} fill="var(--dim)">
          {k}
        </text>
        <rect x="26" y="1.5" width="22" height="2" rx="1" fill="var(--line)" />
        <rect x="26" y="1.5" height="2" rx="1" fill="var(--glow)" width="0">
          <animate attributeName="width" values={`0;0;${[18, 12, 20, 8, 15, 10][i]};${[18, 12, 20, 8, 15, 10][i]};0`} keyTimes={`0;${0.35 + i * 0.05};${0.5 + i * 0.05};0.9;1`} dur="6s" repeatCount="indefinite" />
        </rect>
      </g>
    ))}
    <text x="60" y="76" textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--dim)">
      30 style fields, as JSON
    </text>
  </svg>
);

const texture = (
  <svg viewBox="0 0 120 80" className="h-full w-full">
    <defs>
      <pattern id="mfDots" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.9" fill="var(--fog)" opacity="0.5" />
      </pattern>
      <pattern id="mfWeave" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 3 H6 M3 0 V6" stroke="var(--fog)" strokeWidth="0.6" opacity="0.35" />
      </pattern>
    </defs>
    <rect x="4" y="30" width="46" height="14" rx="7" fill="var(--fog)" />
    <text x="27" y="39.5" textAnchor="middle" fontSize="6.5" fill="var(--ink)" fontWeight="600">
      toner
    </text>
    <Arrow x1={54} x2={66} y={37} />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={70 + (i % 2) * 22} y={14 + Math.floor(i / 2) * 22} width="22" height="22" fill={i % 3 === 0 ? "url(#mfDots)" : "url(#mfWeave)"} opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${0.15 + i * 0.1};${0.3 + i * 0.1};0.9;1`} dur="6s" repeatCount="indefinite" />
      </rect>
    ))}
    <rect x="70" y="14" width="44" height="44" fill="none" stroke="var(--glow)" strokeWidth="1" strokeDasharray="3 3" opacity="0">
      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.65;0.9;1" dur="6s" repeatCount="indefinite" />
    </rect>
    <text x="60" y="72" textAnchor="middle" fontSize="6" fontFamily={MONO} fill="var(--dim)">
      seamless tile, blended on the map
    </text>
  </svg>
);

const USES: { model: string; image?: boolean; title: string; how: string; art: ReactNode }[] = [
  { model: "Muse Spark 1.3", title: "Structured extraction", how: "Prose, PDFs and scans become typed events: place, time, value, confidence, quote. Schema-validated.", art: extract },
  { model: "Muse Spark 1.3", title: "Photo captions", how: "EXIF gives where and when; vision writes the title, summary and category.", art: vision },
  { model: "Muse Spark 1.3", title: "Column mapping", how: "One call maps the headers onto the schema; rows convert without the model.", art: table },
  { model: "Muse Spark 1.3", title: "Geocoding fallback", how: "OpenStreetMap geocoders first; venues and historical names they miss go to Muse in batches.", art: geocode },
  { model: "Muse Spark 1.3", title: "Conversation with tools", how: "Streams answers and calls focusMap and queryEvents, so the map moves as it explains.", art: chat },
  { model: "Muse Spark 1.3", title: "Look design", how: "A one-line brief becomes a complete basemap style: thirty fields, as JSON.", art: design },
  { model: "Muse Image 1.0", image: true, title: "Surface textures", how: "Paper, toner, canvas and wash, painted as tiles and blended over the map in screen space.", art: texture },
];

export function MuseFigure() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {USES.map((u, i) => (
        <div key={u.title} className={`flex items-center gap-3 rounded-xl border border-line bg-ink-2 p-2.5 ${i === USES.length - 1 ? "sm:col-span-2" : ""}`}>
          <div className="h-[88px] w-[132px] shrink-0 rounded-lg bg-ink/60">{u.art}</div>
          <div className="min-w-0">
            <div className={`font-mono text-[10px] uppercase tracking-[0.2em] ${u.image ? "text-glow-2" : "text-glow"}`}>{u.model}</div>
            <div className="text-[15px] font-semibold leading-tight text-fog">{u.title}</div>
            <p className="mt-0.5 text-xs leading-snug text-mist">{u.how}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

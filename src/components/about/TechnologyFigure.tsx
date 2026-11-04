"use client";

import { useEffect, useState } from "react";

// The architecture. The Muse boxes take turns lighting up with their edges;
// the Muse chapter that follows shows each call in detail.
export function TechnologyFigure() {
  const [imageJob, setImageJob] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setImageJob((v) => !v), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <svg viewBox="0 0 560 300" className="w-full" role="img" aria-label="Architecture: browser, Next.js on Vercel, AI Gateway, Muse Spark and Muse Image, open geodata services">
        <defs>
          <linearGradient id="tfMuse" x1="0" x2="1">
            <stop offset="0" stopColor="var(--glow)" />
            <stop offset="1" stopColor="var(--glow-2)" />
          </linearGradient>
        </defs>
        {/* Browser */}
        <Box x={10} y={20} w={150} h={110} title="Browser" lines={["Next.js 16, React 19", "MapLibre GL maps", "Studio, View, Explore"]} />
        {/* Server */}
        <Box x={190} y={20} w={150} h={110} title="Vercel Functions" lines={["App Router, AI SDK 7", "Ingest pipeline", "Pattern engine"]} />
        {/* Gateway */}
        <Box x={390} y={20} w={160} h={44} title="Vercel AI Gateway" lines={["one key, every model"]} />
        {/* Muse */}
        <g>
          <rect x="390" y="80" width="160" height="50" rx="10" fill="var(--ink-2)" stroke={imageJob ? "var(--line)" : "url(#tfMuse)"} strokeWidth={imageJob ? 1 : 2} className={imageJob ? "" : "tf-lit"} />
          <text x="402" y="100" fontSize="11" fontWeight="600" fill="var(--fog)">
            Muse Spark 1.3
          </text>
          <text x="402" y="116" fontSize="9" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
            text · vision · tools
          </text>
          <rect x="390" y="140" width="160" height="40" rx="10" fill="var(--ink-2)" stroke={imageJob ? "url(#tfMuse)" : "var(--line)"} strokeWidth={imageJob ? 2 : 1} className={imageJob ? "tf-lit" : ""} />
          <text x="402" y="158" fontSize="11" fontWeight="600" fill="var(--fog)">
            Muse Image 1.0
          </text>
          <text x="402" y="172" fontSize="9" fontFamily="var(--font-geist-mono)" fill="var(--dim)">
            textures for looks
          </text>
        </g>
        {/* Open services */}
        <Box x={190} y={160} w={150} h={110} title="Open geodata" lines={["OpenFreeMap tiles", "Photon, Nominatim", "Natural Earth relief"]} />
        <Box x={10} y={160} w={150} h={110} title="Storage" lines={["Vercel Blob", "stories, looks, photos", "Signed email sessions"]} />

        {/* Edges */}
        <Edge d="M160 75 H190" />
        <Edge d="M340 42 H390" lit />
        <Edge d="M470 64 V80" lit={!imageJob} />
        <Edge d="M470 64 V80 M470 130 V140" lit={imageJob} />
        <Edge d="M265 130 V160" />
        <Edge d="M85 130 V160" />
        <Edge d="M160 215 H190" />

        {/* Packets on the gateway edge */}
        <circle r="3.5" fill="var(--glow)">
          <animateMotion path="M340 38 H390" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle r="3.5" fill="var(--glow-2)">
          <animateMotion path="M390 48 H340" dur="1.4s" begin="0.7s" repeatCount="indefinite" />
        </circle>
      </svg>

    </div>
  );
}

function Box({ x, y, w, h, title, lines }: { x: number; y: number; w: number; h: number; title: string; lines: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="10" fill="var(--ink-2)" stroke="var(--line)" />
      <text x="12" y="20" fontSize="11" fontWeight="600" fill="var(--fog)">
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={l} x="12" y={38 + i * 14} fontSize="8.5" fontFamily="var(--font-geist-mono)" fill="var(--mist)">
          {l}
        </text>
      ))}
    </g>
  );
}

function Edge({ d, lit }: { d: string; lit?: boolean }) {
  return <path d={d} fill="none" stroke={lit ? "var(--glow)" : "var(--line)"} strokeWidth={lit ? 2 : 1.5} strokeDasharray={lit ? "5 5" : undefined} className={lit ? "tf-flow" : ""} />;
}

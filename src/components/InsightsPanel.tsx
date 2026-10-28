"use client";

import type { Insight } from "@/lib/types";

const KIND_COLOR: Record<Insight["kind"], string> = {
  anomaly: "#f87171",
  cluster: "#fbbf24",
  correlation: "#a78bfa",
  gap: "#94a3b8",
  trend: "#34d399",
};

// Findings from the pattern engine, shown at the top of the Explore panel.
// Click one to see it on the map; "Investigate why" hands it to the chat.
export function FindingsList({ insights, onPick, onAsk }: { insights: Insight[]; onPick: (i: Insight) => void; onAsk: (q: string) => void }) {
  if (!insights.length) return <p className="text-xs text-dim">The pattern engine found nothing statistically unusual in this data.</p>;
  return (
    <div className="space-y-2">
      {insights.map((i) => (
        <div key={i.id} className="rounded-lg border border-line bg-ink-2 p-3 hover:border-mist/40">
          <button onClick={() => onPick(i)} className="block w-full text-left">
            <div className="flex items-center gap-2">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: KIND_COLOR[i.kind] + "22", color: KIND_COLOR[i.kind] }}>
                {i.kind}
              </span>
              <span className="ml-auto font-mono text-[10px] text-dim">score {i.score.toFixed(2)}</span>
            </div>
            <div className="mt-1.5 text-sm font-medium">{i.title}</div>
            <div className="mt-1 text-xs leading-relaxed text-mist">{i.detail}</div>
          </button>
          <button onClick={() => onAsk(`Investigate this finding and propose possible causes using the data: ${i.title}. ${i.detail}`)} className="mt-2 text-xs text-glow hover:underline">
            Investigate why
          </button>
        </div>
      ))}
    </div>
  );
}

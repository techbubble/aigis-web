import type { MarkerShape } from "@/lib/types";
import { shapePath } from "@/lib/markers";

// Inline SVG preview of a marker shape, for the key and the design panel.
export function MarkerIcon({ shape, color, size = 18 }: { shape: MarkerShape; color: string; size?: number }) {
  const d = shapePath(shape);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {shape === "ring" ? (
        <>
          <path d={d} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={7} />
          <path d={d} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <path d={d} fill={color} stroke="#fff" strokeOpacity={0.9} strokeWidth={3} strokeLinejoin="round" />
          {shape === "pin" && <circle cx={32} cy={24} r={7} fill="#fff" fillOpacity={0.92} />}
          {shape === "dot" && <circle cx={32} cy={32} r={5} fill="#fff" fillOpacity={0.9} />}
        </>
      )}
    </svg>
  );
}

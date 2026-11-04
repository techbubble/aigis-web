"use client";

import { SHAPES } from "@/lib/markers";
import { MARKER_COLORS, type MarkerStyle } from "@/lib/types";
import { MarkerIcon } from "./MarkerIcon";

// Studio-only: marker shape, color and options for this story. Rendered in
// the General tab; saved with the story through the Save button.
export function MarkerDesign({ marker, onMarker }: { marker: MarkerStyle; onMarker: (m: MarkerStyle) => void }) {
  return (
    <>
      <Section title="Markers" hint="Every event on the map gets the same marker">
        <div className="grid grid-cols-6 gap-1.5">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => onMarker({ ...marker, shape: s.id })}
              className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 transition ${s.id === marker.shape ? "border-glow bg-glow/10 text-fog" : "border-line text-mist hover:border-mist/60 hover:text-fog"}`}
            >
              <MarkerIcon shape={s.id} color={marker.color} size={20} />
              <span className="text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {MARKER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onMarker({ ...marker, color: c })}
              className={`h-6 w-6 shrink-0 rounded-full border-2 transition ${c.toLowerCase() === marker.color.toLowerCase() ? "scale-110 border-fog" : "border-transparent hover:scale-105"}`}
              style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)" }}
              title={c}
              aria-label={`Marker color ${c}`}
            />
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-mist">
            <input
              type="color"
              value={marker.color}
              onChange={(e) => onMarker({ ...marker, color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-line bg-transparent p-0.5"
              aria-label="Custom marker color"
            />
            custom
          </label>
        </div>
      </Section>

    </>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className={`text-[10px] uppercase tracking-[0.2em] text-dim ${hint ? "" : "mb-3"}`}>{title}</div>
      {hint && <div className="mb-3 text-xs text-mist">{hint}</div>}
      {children}
    </div>
  );
}

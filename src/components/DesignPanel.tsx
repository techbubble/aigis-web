"use client";

import { isDarkTheme, THEMES, type Theme } from "@/lib/map/styles";
import type { MarkerStyle } from "@/lib/types";
import { MarkerDesign, Section } from "./MarkerDesign";

// Studio-only: appearance of this story. Markers first, then the basemap look.
export function DesignPanel({
  marker,
  onMarker,
  themeId,
  dirty,
  saving,
  savedAt,
  onTheme,
  onSave,
  onSaveView,
  viewSaving,
  viewSavedAt,
  hasDefaultView,
}: {
  marker: MarkerStyle;
  onMarker: (m: MarkerStyle) => void;
  themeId: string;
  dirty: boolean;
  saving: boolean;
  savedAt: string | null;
  onTheme: (id: string) => void;
  onSave: () => void;
  onSaveView: () => void;
  viewSaving: boolean;
  viewSavedAt: string | null;
  hasDefaultView: boolean;
}) {
  const LookTile = ({ t }: { t: Theme }) => {
    const fg = isDarkTheme(t) ? "#ffffff" : "#000000";
    const active = t.id === themeId;
    return (
      <div className="group relative">
        <button
          onClick={() => onTheme(t.id)}
          className={`relative block h-24 w-full overflow-hidden rounded-lg border text-left transition ${active ? "border-glow ring-2 ring-glow/50" : "border-line hover:border-mist/60"}`}
          aria-pressed={active}
          title={t.mood}
        >
          <LookSwatch t={t} />
          <span className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/85 px-2 py-1 text-[11px] font-medium text-white">
            <span className="truncate">{t.name}</span>
            {active && <span className="ml-2 shrink-0 text-glow">&#10003;</span>}
          </span>
          <span className="absolute bottom-1.5 left-2 right-2 truncate text-[10px]" style={{ color: fg, textShadow: fg === "#ffffff" ? "0 0 3px #000, 0 0 2px #000" : "0 0 3px #fff, 0 0 2px #fff" }}>
            {t.mood}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="scroll-thin flex h-full flex-col overflow-auto px-5 pb-44 pt-2">
      <MarkerDesign marker={marker} onMarker={onMarker} />

      <Section title="Default view" hint="Where viewers start: the map's position and zoom right now">
        <button onClick={onSaveView} disabled={viewSaving} className="w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm font-medium text-fog hover:border-mist/60 disabled:opacity-50">
          {viewSaving ? "Saving view" : "Save current view as default"}
        </button>
        <div className="mt-1.5 text-[11px] text-dim">{viewSavedAt ? `Saved ${new Date(viewSavedAt).toLocaleTimeString()}` : hasDefaultView ? "A default view is saved" : "No default view yet: viewers open on the whole story"}</div>
      </Section>

      <Section title="Basemap" hint="Drawn from OpenStreetMap data">
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <LookTile key={t.id} t={t} />
          ))}
        </div>
      </Section>

      <div className="mt-auto border-t border-line pt-4">
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="w-full rounded-full bg-fog py-2.5 text-sm font-semibold text-ink hover:opacity-85 disabled:opacity-50"
        >
          {saving ? "Saving" : dirty ? "Save" : "Saved"}
        </button>
        <div className="mt-2 text-center text-[11px] text-dim">
          {savedAt ? `Last saved ${new Date(savedAt).toLocaleString()}` : "Not saved yet"} · viewers see the saved version
        </div>
      </div>
    </div>
  );
}

// A stylized miniature of the look: land, a bay, a park, two roads, a boundary,
// with the look's texture laid over, so the tile is the look.
function LookSwatch({ t }: { t: Theme }) {
  return (
    <span className="absolute inset-0" aria-hidden>
      <svg viewBox="0 0 160 96" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <rect width="160" height="96" fill={t.background} />
        <path d="M0 60 C 30 40, 60 80, 95 62 S 140 70, 160 50 L160 96 L0 96 Z" fill={t.water} />
        <path d="M0 60 C 30 40, 60 80, 95 62 S 140 70, 160 50" fill="none" stroke={t.waterLine} strokeWidth="1" opacity="0.8" />
        <ellipse cx="38" cy="36" rx="22" ry="12" fill={t.park} opacity={t.landcoverOpacity} />
        <ellipse cx="120" cy="30" rx="26" ry="10" fill={t.wood} opacity={t.landcoverOpacity} />
        {(t.roadStyle ?? "cased") !== "hidden" && (
          <>
            <path d="M0 30 L160 22" stroke={t.roadCasing} strokeWidth={(t.roadStyle ?? "cased") === "cased" ? 4 : 0} opacity={t.roadOpacity} />
            <path d="M0 30 L160 22" stroke={t.roadMajor} strokeWidth={(t.roadStyle ?? "cased") === "single" ? 1.2 : 2.2} opacity={t.roadOpacity} />
            <path d="M70 0 L92 60" stroke={t.roadMinor} strokeWidth="1" opacity={t.roadOpacity} />
          </>
        )}
        <path d="M0 48 L160 40" stroke={t.boundary} strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7" />
      </svg>
      {t.texture && <span className="absolute inset-0" style={{ backgroundImage: `url("${t.texture.url}")`, backgroundSize: "320px 320px", mixBlendMode: t.texture.blend, opacity: t.texture.opacity }} />}
      {t.halftone && (
        <span
          className="absolute inset-0"
          style={{ backgroundImage: `radial-gradient(circle, ${t.halftone.color} 0 0.6px, transparent 0.8px)`, backgroundSize: `${t.halftone.size}px ${t.halftone.size}px`, opacity: t.halftone.opacity }}
        />
      )}
    </span>
  );
}



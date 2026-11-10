"use client";

import { useState } from "react";
import { isDarkTheme, THEMES, type Theme } from "@/lib/map/styles";
import type { MarkerStyle } from "@/lib/types";
import { MarkerDesign, Section } from "./MarkerDesign";

// Studio-only: appearance of this story. Markers first, then the basemap look.
export function DesignPanel({
  looks,
  onLooks,
  marker,
  onMarker,
  themeId,
  dirty,
  saving,
  savedAt,
  onTheme,
  onSave,
}: {
  looks: Theme[];
  onLooks: (looks: Theme[]) => void;
  marker: MarkerStyle;
  onMarker: (m: MarkerStyle) => void;
  themeId: string;
  dirty: boolean;
  saving: boolean;
  savedAt: string | null;
  onTheme: (id: string) => void;
  onSave: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [designing, setDesigning] = useState(false);
  const [designError, setDesignError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const design = async () => {
    const prompt = brief.trim();
    if (!prompt || designing) return;
    setDesigning(true);
    setDesignError(null);
    try {
      const res = await fetch("/api/looks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      const j = (await res.json()) as Theme & { error?: string };
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      onLooks([...looks, j]);
      onTheme(j.id);
      setBrief("");
    } catch (err) {
      setDesignError((err as Error).message);
    } finally {
      setDesigning(false);
    }
  };
  const [repainting, setRepainting] = useState<string | null>(null);
  const repaint = async (id: string) => {
    if (repainting) return;
    setRepainting(id);
    try {
      const res = await fetch(`/api/looks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ repaint: true }) });
      const j = (await res.json()) as Theme & { error?: string };
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      onLooks(looks.map((l) => (l.id === id ? j : l)));
    } catch (err) {
      setDesignError((err as Error).message);
    } finally {
      setRepainting(null);
    }
  };
  const remove = async (id: string) => {
    setConfirm(null);
    const res = await fetch(`/api/looks/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    onLooks(looks.filter((l) => l.id !== id));
    if (themeId === id) onTheme(THEMES[0].id);
  };

  const LookTile = ({ t, deletable }: { t: Theme; deletable?: boolean }) => {
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
        {deletable && confirm !== t.id && (
          <button
            onClick={() => repaint(t.id)}
            disabled={repainting === t.id}
            className={`absolute bottom-1 right-6 rounded p-1 transition hover:bg-black/40 ${repainting === t.id ? "animate-pulse opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            style={{ color: fg }}
            aria-label={`Repaint texture of ${t.name}`}
            title={repainting === t.id ? "Painting four tiles" : "Repaint the texture"}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.5 2.5l3 3L6 13H3v-3z" />
              <path d="M9 4l3 3" />
            </svg>
          </button>
        )}
        {deletable && confirm !== t.id && (
          <button
            onClick={() => setConfirm(t.id)}
            className="absolute bottom-1 right-1 rounded p-1 opacity-0 transition hover:bg-black/40 group-hover:opacity-100"
            style={{ color: fg }}
            aria-label={`Delete look ${t.name}`}
            title="Delete look"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 4h10M6 4V2.5h4V4M5 4l.7 9h4.6L11 4" />
            </svg>
          </button>
        )}
        {confirm === t.id && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-ink/95 px-2 text-[11px]">
            <span className="text-mist">Delete this look?</span>
            <span className="flex gap-1">
              <button onClick={() => remove(t.id)} className="rounded bg-red-500/90 px-2 py-0.5 font-medium text-white">
                Delete
              </button>
              <button onClick={() => setConfirm(null)} className="rounded border border-line px-2 py-0.5 text-mist">
                Keep
              </button>
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scroll-thin flex h-full flex-col overflow-auto px-5 pb-44 pt-2">
      <MarkerDesign marker={marker} onMarker={onMarker} />




      <Section title="Design a look" hint="Describe it; AIGIS sets every color and treatment and paints the surface">
        <div className={`rounded-lg border bg-white p-2 ${designing ? "border-glow" : "border-line"}`}>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) design();
            }}
            rows={2}
            placeholder="Stamen watercolor: soft washes, pooled edges, no roads, paper grain"
            className="w-full resize-none bg-transparent px-1 py-0.5 text-sm text-ink outline-none placeholder:text-ink-3/70"
            disabled={designing}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-3">{designing ? "Designing the look and painting its texture, about 20 seconds" : "Saved to your looks; choose it for any story"}</span>
            <button onClick={design} disabled={designing || !brief.trim()} className="rounded-md bg-glow px-3 py-1 text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50">
              {designing ? "Designing" : "Design"}
            </button>
          </div>
          {designError && <div className="mt-1.5 text-[11px] text-red-600">{designError}</div>}
        </div>
      </Section>

      {looks.length > 0 && (
        <Section title="Your looks" hint="Designed in Studio">
          <div className="grid grid-cols-2 gap-2">
            {looks.map((t) => (
              <LookTile key={t.id} t={t} deletable />
            ))}
          </div>
        </Section>
      )}

      <Section title="Built-in looks" hint="Basemap drawn from OpenStreetMap data">
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



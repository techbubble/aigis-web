"use client";

import { useState } from "react";
import type { GeoEvent } from "@/lib/types";
import { fmtDate, fmtNum } from "@/lib/format";
import { Lightbox } from "./Lightbox";

export function DetailPanel({ event, color, onClose, onAsk }: { event: GeoEvent | null; color: string; onClose: () => void; onAsk: (q: string) => void }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
    {zoom && event?.media && <Lightbox media={event.media} title={event.title} caption={event.summary} onClose={() => setZoom(false)} />}
    <aside
      className={`pointer-events-auto absolute left-0 top-0 z-20 flex h-full w-[380px] max-w-[90vw] flex-col border-r border-line bg-ink/95 shadow-2xl backdrop-blur transition-transform duration-300 ${
        event ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-hidden={!event}
    >
      {event && (
        <>
          <div className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-16">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider" style={{ color }}>
                {event.category}
              </div>
              <h2 className="mt-0.5 text-lg font-semibold leading-snug">{event.title}</h2>
              <div className="mt-1 font-mono text-sm text-mist">
                {fmtDate(event.t)}
                {event.tEnd && event.tEnd !== event.t ? ` to ${fmtDate(event.tEnd)}` : ""}
              </div>
            </div>
            <button onClick={onClose} className="rounded p-1 text-mist hover:bg-ink-3 hover:text-fog" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>

          <div className="scroll-thin flex-1 overflow-auto px-5 py-4 text-sm">
            {event.media && (
              <button onClick={() => setZoom(true)} className="group relative mb-4 block w-full overflow-hidden rounded-lg border border-line bg-ink-2" title="View larger">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.media.thumb} alt={event.title} className="block w-full object-cover transition group-hover:scale-[1.02]" style={{ aspectRatio: `${event.media.w} / ${event.media.h}` }} />
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">View larger</span>
              </button>
            )}
            {event.media?.credit && (
              <div className="-mt-3 mb-4 text-[11px] text-dim">
                {event.media.link ? (
                  <a href={event.media.link} target="_blank" rel="noreferrer" className="hover:text-mist hover:underline">
                    {event.media.credit}
                  </a>
                ) : (
                  event.media.credit
                )}
              </div>
            )}
            <p className="leading-relaxed text-fog">{event.summary}</p>

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <Row k="Place" v={event.place} />
              <Row k="Coordinates" v={`${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`} mono />
              <Row k="Place type" v={event.placeType} />
              {event.value != null && <Row k="Value" v={`${fmtNum(event.value)}${event.unit ? " " + event.unit : ""}`} />}
              <Row k="Confidence" v={`${Math.round(event.confidence * 100)}%`} />
              <Row k="Located by" v={geocoderLabel(event.geocoder)} />
              {event.media && event.geocoder === "exif" && <Row k="Camera" v={event.sourceQuote} />}
              <Row k="Source" v={event.sourceFile} mono />
              <Row k="Event id" v={event.id} mono />
            </dl>

            {event.entities.length > 0 && (
              <div className="mt-5">
                <div className="text-xs uppercase tracking-wider text-dim">Entities</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {event.entities.map((e) => (
                    <span key={e} className="rounded border border-line bg-ink-2 px-1.5 py-0.5 text-xs">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.sourceQuote && (
              <div className="mt-5">
                <div className="text-xs uppercase tracking-wider text-dim">From the source</div>
                <blockquote className="mt-1.5 border-l-2 border-line pl-3 text-xs italic leading-relaxed text-mist">{event.sourceQuote}</blockquote>
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <button
              onClick={() => onAsk(`Tell me more about "${event.title}" at ${event.place} on ${fmtDate(event.t)} and what happened around it.`)}
              className="w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm text-fog hover:bg-ink-3"
            >
              Ask AIGIS about this event
            </button>
          </div>
        </>
      )}
    </aside>
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-dim">{k}</dt>
      <dd className={`break-words text-fog ${mono ? "font-mono" : ""}`}>{v}</dd>
    </>
  );
}

function geocoderLabel(g: GeoEvent["geocoder"]) {
  if (g === "exif") return "Photo GPS (EXIF)";
  return g === "source" ? "coordinates in source" : g === "model" ? "Muse Spark" : g === "photon" ? "Photon (OSM)" : "Nominatim (OSM)";
}


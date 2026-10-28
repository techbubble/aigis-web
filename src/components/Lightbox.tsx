"use client";

import { useEffect } from "react";
import type { EventMedia } from "@/lib/types";

// Full-size photo view over the map. Click anywhere or press Escape to close.
export function Lightbox({ media, title, caption, onClose }: { media: EventMedia; title: string; caption?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label={title}>
      <figure className="max-h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.full} alt={title} width={media.w} height={media.h} className="max-h-[82vh] w-auto max-w-full rounded-lg shadow-2xl" />
        <figcaption className="mt-3 flex items-start justify-between gap-6 text-sm">
          <div>
            <div className="font-medium text-white">{title}</div>
            {caption && <div className="mt-0.5 max-w-2xl text-white/60">{caption}</div>}
            {media.credit && (
              <div className="mt-1 text-xs text-white/40">
                {media.link ? (
                  <a href={media.link} target="_blank" rel="noreferrer" className="hover:text-white/70 hover:underline">
                    {media.credit}
                  </a>
                ) : (
                  media.credit
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10">
            Close
          </button>
        </figcaption>
      </figure>
    </div>
  );
}

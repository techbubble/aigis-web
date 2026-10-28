"use client";

import { withDefaults, type Theme } from "@/lib/map/styles";

// Screen-space surface treatments for a look: generated texture, halftone
// screen and grain. Sits over the map canvas, under the UI, never catches input.
export function LookOverlay({ theme }: { theme: Theme }) {
  const t = withDefaults(theme);
  const grainUrl =
    t.grain > 0
      ? `url("data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
        )}")`
      : null;
  return (
    <>
      {t.texture && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: `url("${t.texture.url}")`, backgroundSize: `${t.texture.scale}px ${t.texture.scale}px`, backgroundRepeat: "repeat", mixBlendMode: t.texture.blend, opacity: t.texture.opacity }}
        />
      )}
      {t.halftone && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, ${t.halftone.color} 0 0.9px, transparent 1.1px)`,
            backgroundSize: `${t.halftone.size}px ${t.halftone.size}px`,
            opacity: t.halftone.opacity,
          }}
        />
      )}
      {grainUrl && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: grainUrl, backgroundSize: "180px 180px", mixBlendMode: "overlay", opacity: t.grain }} />}
    </>
  );
}

// Generates the animated workflow graphic (documents -> extraction -> globe) as
// self-contained SVG with SMIL animation, so it plays in a README and in an
// <img>. Two variants: workflow.svg with a dark card background for the
// README, workflow-hero.svg transparent for the landing page.
// Run: node scripts/gen-workflow-svg.mjs
import { promises as fs } from "node:fs";

const W = 1200, H = 470, T = 12;
const SPIN = 3 * T; // one rotation per three document cycles, so landings repeat exactly
const TYPES = [["PDF", "#f43f5e"], ["XLSX", "#22c55e"], ["JPG", "#f59e0b"], ["CSV", "#22d3ee"], ["MD", "#a78bfa"], ["EML", "#60a5fa"]];
// A stream, not a queue: 24 documents per cycle, one every half second,
// in six lanes, so several are always in flight.
const N = 24, STEP = T / N;
const DOCS = Array.from({ length: N }, (_, i) => {
  const [label, color] = TYPES[(i * 5) % TYPES.length];
  const lane = (i * 7) % 6;
  return [label, color, 70 + lane * 52 + ((i * 13) % 3) * 6, i * STEP];
});
const mx = 600, my = 218; // thirds: documents at 200, extraction at 600, globe at 1000
const gx = 1000, gy = 218, gr = 150;
const LAND = [[945, 150], [1030, 128], [1080, 212], [963, 250], [1020, 285], [913, 195]];

// Natural Earth 1:110m countries, equirectangular, scrolled under the globe
// clip. Equal scale on both axes, so the band is wider than the globe is
// tall and the poles fall outside the circle.
const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
async function countryPaths(band) {
  const res = await fetch(NE);
  if (!res.ok) throw new Error(`Natural Earth fetch failed: ${res.status}`);
  const geo = await res.json();
  const k = band / 360;
  const paths = [];
  for (const f of geo.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      let d = "";
      for (const ring of poly) {
        const pts = ring.map(([lng, lat]) => [((lng + 180) * k).toFixed(1), ((-lat) * k).toFixed(1)]);
        const xs = pts.map((p) => +p[0]), ys = pts.map((p) => +p[1]);
        if (Math.max(...xs) - Math.min(...xs) < 2 && Math.max(...ys) - Math.min(...ys) < 2) continue;
        d += "M" + pts.map((p) => p.join(",")).join("L") + "Z";
      }
      if (d) paths.push(d);
    }
  }
  return paths;
}

function gear(cx, cy, r, teeth, depth = 0.22) {
  const pts = [];
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const rr = i % 4 === 1 || i % 4 === 2 ? r * (1 + depth) : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return "M" + pts.join(" L") + " Z";
}

function build(withBg, land) {
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif">`);
  o.push(`<defs>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#60a5fa" stop-opacity="0.9"/><stop offset="1" stop-color="#60a5fa" stop-opacity="0"/></radialGradient>
  <radialGradient id="shade" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="0.55" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.55"/></radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0.82" stop-color="#60a5fa" stop-opacity="0"/><stop offset="0.92" stop-color="#60a5fa" stop-opacity="0.35"/><stop offset="1" stop-color="#60a5fa" stop-opacity="0"/></radialGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262c38"/><stop offset="1" stop-color="#1b1f27"/></linearGradient>
  <clipPath id="globe"><circle cx="${gx}" cy="${gy}" r="${gr}"/></clipPath>
</defs>`);
  if (withBg) o.push(`<rect width="${W}" height="${H}" rx="18" fill="#0b0e14"/>`);
  const dash = `stroke="#334155" stroke-width="2" stroke-dasharray="6 8" fill="none"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite"/></path>`;
  o.push(`<path d="M 40 ${my} H ${mx - 112}" ${dash}`);
  o.push(`<path d="M ${mx + 112} ${my} H ${gx - gr - 12}" ${dash}`);
  const cap = (x, t, verb, detail) => {
    o.push(`<text x="${x}" y="408" fill="#8b95a7" font-size="14" text-anchor="middle" letter-spacing="2">${t}</text>`);
    o.push(`<text x="${x}" y="438" fill="#e5e9f0" font-size="17" text-anchor="middle"><tspan font-weight="700">${verb}</tspan><tspan fill="#aab3c2"> ${detail}</tspan></text>`);
  };
  cap(200, "ANY DOCUMENT", "Read", "PDF, XLSX, CSV, images, text");
  cap(mx, "AIGIS", "Extract", "place, time, magnitude");
  cap(gx, "ANIMATED MAP", "Discover", "bursts, hotspots, lead/lag");

  DOCS.forEach(([label, color, y, b]) => {
    o.push(`<g opacity="0">`);
    o.push(`<animateTransform attributeName="transform" type="translate" values="-60,${y}; 200,${y}; ${mx - 130},${my}; ${mx - 130},${my}" keyTimes="0;0.09;0.2;1" dur="${T}s" begin="${b.toFixed(2)}s" repeatCount="indefinite"/>`);
    o.push(`<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.015;0.185;0.2;1" dur="${T}s" begin="${b.toFixed(2)}s" repeatCount="indefinite"/>`);
    o.push(`<rect x="-22" y="-28" width="44" height="56" rx="6" fill="#20252e" stroke="${color}" stroke-width="2"/>`);
    o.push(`<path d="M 8 -28 L 22 -14 L 8 -14 Z" fill="${color}" opacity="0.8"/>`);
    if (label === "JPG") o.push(`<path d="M -14 14 L -4 0 L 4 8 L 10 2 L 16 14 Z" fill="${color}" opacity="0.8"/><circle cx="-8" cy="-6" r="3" fill="${color}"/>`);
    else if (label === "XLSX" || label === "CSV") for (let k = 0; k < 3; k++) o.push(`<rect x="-14" y="${-10 + k * 8}" width="28" height="6" fill="${color}" opacity="${0.35 + 0.2 * k}"/>`);
    else for (let k = 0; k < 4; k++) o.push(`<rect x="-14" y="${-12 + k * 7}" width="${28 - (k % 2) * 8}" height="3" rx="1.5" fill="${color}" opacity="0.7"/>`);
    o.push(`<text x="0" y="22" fill="${color}" font-size="9" font-weight="700" text-anchor="middle">${label}</text>`);
    o.push(`</g>`);
  });

  o.push(`<rect x="${mx - 105}" y="${my - 100}" width="210" height="200" rx="22" fill="url(#panel)" stroke="#2a3447" stroke-width="2"/>`);
  o.push(`<circle cx="${mx}" cy="${my}" r="120" fill="url(#glow)" opacity="0.35">`);
  for (const [, , , b] of DOCS) o.push(`<animate attributeName="opacity" values="0.35;0.35;1;0.35;0.35" keyTimes="0;0.19;0.21;0.26;1" dur="${T}s" begin="${b.toFixed(2)}s" repeatCount="indefinite"/>`);
  o.push(`</circle>`);
  o.push(`<g fill="#171a20" stroke="#60a5fa" stroke-width="2.5" stroke-linejoin="round">`);
  o.push(`<path d="${gear(mx, my, 42, 12)}"><animateTransform attributeName="transform" type="rotate" from="0 ${mx} ${my}" to="360 ${mx} ${my}" dur="14s" repeatCount="indefinite"/></path>`);
  o.push(`<path d="${gear(mx + 58, my - 40, 20, 8)}" stroke="#f472b6"><animateTransform attributeName="transform" type="rotate" from="360 ${mx + 58} ${my - 40}" to="0 ${mx + 58} ${my - 40}" dur="7s" repeatCount="indefinite"/></path>`);
  o.push(`<path d="${gear(mx - 52, my + 46, 16, 7)}" stroke="#34d399"><animateTransform attributeName="transform" type="rotate" from="360 ${mx - 52} ${my + 46}" to="0 ${mx - 52} ${my + 46}" dur="5.5s" repeatCount="indefinite"/></path>`);
  o.push(`</g>`);
  o.push(`<circle cx="${mx}" cy="${my}" r="16" fill="#60a5fa" opacity="0.9"><animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite"/></circle>`);
  o.push(`<text x="${mx}" y="${my + 5}" fill="#171a20" font-size="11" font-weight="800" text-anchor="middle">A</text>`);
  o.push(`<text x="${mx}" y="${my - 72}" fill="#e5e9f0" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="1">Read · Locate · Date</text>`);
  o.push(`<text x="${mx}" y="${my + 84}" fill="#8b95a7" font-size="11" text-anchor="middle">extract · caption · design · texture</text>`);

  DOCS.forEach(([, color, , b], i) => {
    const [lx, ly] = LAND[i % LAND.length];
    const cx = (mx + 105 + lx) / 2, cy = my - 120 + (i % 6) * 22;
    const path = `M ${mx + 105} ${my} Q ${cx.toFixed(0)} ${cy.toFixed(0)} ${lx} ${ly}`;
    o.push(`<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.21;0.22;0.33;0.34;1" dur="${T}s" begin="${b.toFixed(2)}s" repeatCount="indefinite"/>`);
    o.push(`<circle r="7" fill="${color}" opacity="0.35"/><circle r="3.5" fill="${color}"/>`);
    o.push(`<animateMotion path="${path}" dur="${T}s" begin="${b.toFixed(2)}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;0.21;0.34;1"/>`);
    o.push(`</g>`);
  });

  o.push(`<circle cx="${gx}" cy="${gy}" r="${gr + 26}" fill="url(#halo)"/>`);
  o.push(`<circle cx="${gx}" cy="${gy}" r="${gr}" fill="#1d5fd6"/>`);
  const band = Math.round(2 * Math.PI * gr);
  // Landed events live in the rotating layer so they travel with the globe.
  // A bit lands at screen point P at time tL; the marker is placed at the band
  // coordinate that is under P at that moment, once per rotation cycle.
  const marks = [];
  DOCS.forEach(([, color, , b], i) => {
    const [px, py] = LAND[i % LAND.length];
    for (let j = 0; j < SPIN / T; j++) {
      const tL = b + 0.34 * T + j * T;
      const off = (band * ((tL % SPIN) / SPIN));
      const qx = (((px - (gx - band / 2)) + off) % band + band) % band;
      const qy = py - gy;
      const k0 = tL / SPIN, k1 = Math.min(1, (tL + 0.9) / SPIN), k2 = Math.min(1, (tL + 6) / SPIN), k3 = Math.min(1, (tL + 7.5) / SPIN);
      for (const wrap of [0, 1]) {
        const x = (qx + wrap * band).toFixed(1);
        marks.push(`<circle cx="${x}" cy="${qy}" r="0" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"><animate attributeName="r" values="0;0;26;26" keyTimes="0;${k0};${k1};1" dur="${SPIN}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;0.95;0;0" keyTimes="0;${k0};${k0 + 0.002};${k1};1" dur="${SPIN}s" repeatCount="indefinite"/></circle>`);
        marks.push(`<circle cx="${x}" cy="${qy}" r="4.5" fill="${color}" stroke="#0b0e14" stroke-width="1" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${k0};${k0 + 0.002};${k2};${k3};1" dur="${SPIN}s" repeatCount="indefinite"/></circle>`);
      }
    }
  });
  o.push(`<g clip-path="url(#globe)"><g transform="translate(${gx - band / 2} ${gy})">`);
  o.push(`<g fill="#3fa15a" stroke="#1d6b36" stroke-width="0.7" stroke-linejoin="round">`);
  for (let k = 0; k < 2; k++) o.push(`<g transform="translate(${k * band} 0)">${land.map((d) => `<path d="${d}"/>`).join("")}</g>`);
  o.push(`</g>${marks.join("")}`);
  o.push(`<animateTransform attributeName="transform" type="translate" from="${gx - band / 2} ${gy}" to="${gx - band / 2 - band} ${gy}" dur="${SPIN}s" repeatCount="indefinite"/></g></g>`);
  o.push(`<circle cx="${gx}" cy="${gy}" r="${gr}" fill="url(#shade)"/>`);
  // A few faint parallels for roundness; meridians would read as a cage.
  for (const k of [-90, -45, 45, 90]) {
    const r = Math.sqrt(gr * gr - k * k).toFixed(0);
    o.push(`<ellipse cx="${gx}" cy="${gy + k}" rx="${r}" ry="${(r * 0.16).toFixed(0)}" fill="none" stroke="#ffffff" stroke-opacity="0.07"/>`);
  }
  o.push(`<line x1="${gx - gr}" y1="${gy}" x2="${gx + gr}" y2="${gy}" stroke="#ffffff" stroke-opacity="0.07"/>`);

  o.push(`</svg>`);
  return o.join("\n");
}

const land = await countryPaths(Math.round(2 * Math.PI * gr));
await fs.writeFile("public/workflow.svg", build(true, land));
await fs.writeFile("public/workflow-hero.svg", build(false, land));
console.log("wrote public/workflow.svg and public/workflow-hero.svg");

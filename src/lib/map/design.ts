import { generateImage, generateText, Output } from "ai";
import { nanoid } from "nanoid";
import { MODELS } from "../ai/models";
import { saveMedia } from "../media";
import { LookDesignSchema, THEMES, type Theme } from "./styles";

// Muse Spark designs a complete look from a description; Muse Image paints
// the surface texture when the design calls for one. The result is a Theme
// the style generator renders like any built-in.

const SYSTEM = `You are a cartographic designer producing a basemap look for AIGIS, an animated map product. You answer with one JSON object matching the schema. The map is drawn from OpenStreetMap vector data (land, water, forests, parks, built-up areas, buildings, roads, rail, boundaries, labels) and markers for events will be drawn on top of it, so the basemap must stay quiet and legible: the markers are the subject.

How the fields render:
- Colors are CSS hex. background is land. water is the fill of seas and lakes; waterLine is rivers and shorelines. wood, park, residential, building are fills. roadMajor/roadMinor/roadCasing/rail/boundary are strokes. label and labelHalo are text and its halo; the halo must contrast with the label and sit close to the land color.
- hillshade blends Natural Earth relief at low zoom (true for printed, terrain or antique looks); hillshadeOpacity 0.2 to 0.5 when on.
- landcoverOpacity and roadOpacity are 0 to 1.
- labelDensity: sparse for painterly or poster looks, dense for reference maps.
- edgeBleed 0.5 to 0.9 gives soft darker pooling along water and forest edges, the signature of watercolor, gouache and ink wash. 0 for crisp or digital looks.
- lineStyle sketch gives broken, slightly blurred strokes (pen, pencil, etching). solid otherwise.
- roadStyle: cased is the normal outlined road; single is one thin stroke (poster, minimal, painterly); hidden removes roads entirely (watercolor, very abstract).
- buildings false for painterly or poster looks.
- halftone draws a dot screen over the map: enabled for photocopy, newsprint, risograph, comic looks; size 3 to 6, opacity 0.15 to 0.5. enabled false otherwise.
- grain 0.1 to 0.35 adds film grain or paper noise; 0 for clean looks.
- saturation applies to relief imagery, -1 is monochrome.
- labelTransform and labelSpacing shape city labels (uppercase with 0.1 to 0.2 spacing for posters and antique maps).
- textureOverlay: a generated surface laid over the map in screen space. Use it for paper, canvas, watercolor wash, photocopy toner, blueprint fiber, fabric. The prompt must describe only a flat, uniform, fine-grained surface: no objects, no scenery, no text, no map, no large strokes or swirls, no distinct features that the eye could recognize when repeated. Think "tooth of the paper", not "a painting". opacity 0.2 to 0.6; blend multiply on light looks, screen or soft-light on dark looks; scale 2048. enabled false for flat digital looks.

Design rules: the look must read at zoom 2 (continents) and zoom 13 (streets). Keep contrast between land and water. Keep roads subtler than water. Never use pure #000000 land unless the brief asks for it. name is two or three words; mood is a short phrase.`;

const TEXTURE_SYSTEM =
  "Flat surface texture photographed straight down, perfectly even lighting, no vignette, no border, no objects, no text, no watermark, uniform fine grain across the whole frame with no large strokes, swirls or distinct features, low contrast, fills the frame edge to edge: ";
const TILE = 1600; // what Muse Image returns
const OVERLAP = 320;
const OUT = 2560;
export const TEXTURE_SCALE = 2048;

export async function designLook(prompt: string, owner?: string): Promise<Theme> {
  const examples = THEMES.slice(0, 2)
    .map((t) => JSON.stringify({ name: t.name, background: t.background, water: t.water, roadMajor: t.roadMajor, label: t.label, mood: t.mood }))
    .join("\n");
  const result = await generateText({
    model: MODELS.extract,
    system: SYSTEM,
    output: Output.object({ schema: LookDesignSchema }),
    prompt: `Brief: ${prompt}\n\nFor calibration, two built-in looks (partial): \n${examples}`,
    reasoning: "low",
  });
  const output = result.output;
  if (!output || typeof output.background !== "string") {
    throw new Error(`Designer returned no look (finish: ${result.finishReason}; text: ${result.text.slice(0, 400)})`);
  }
  const id = `look-${nanoid(8)}`;
  const { textureOverlay, halftone, ...rest } = output;
  const look: Theme = {
    ...rest,
    id,
    custom: true,
    prompt,
    texturePrompt: textureOverlay.enabled ? textureOverlay.prompt : undefined,
    createdAt: new Date().toISOString(),
    owner,
    texture: null,
    halftone: halftone.enabled ? { size: clamp(halftone.size, 2, 12), opacity: clamp(halftone.opacity, 0.05, 0.8), color: halftone.color } : null,
  };
  if (textureOverlay.enabled && textureOverlay.prompt.trim()) {
    try {
      const url = await paintTexture(id, textureOverlay.prompt);
      look.texture = { url, opacity: clamp(textureOverlay.opacity, 0.05, 0.9), blend: textureOverlay.blend, scale: TEXTURE_SCALE };
    } catch (err) {
      // A look without its texture is still a look.
      console.warn("texture generation failed", (err as Error).message);
    }
  }
  return look;
}

// Paints two tiles; each is used twice, the second time rotated a half turn,
// placed diagonally so no tile sits beside itself. Two sources keep the
// grain density uniform across the surface (four independent renderings
// drift too much), rotation avoids mirror symmetry, and the feathered blend
// hides the joins. Returns the stored URL, cache-busted.
export async function paintTexture(id: string, prompt: string): Promise<string> {
  const sharp = (await import("sharp")).default;
  const [a, b] = await Promise.all(Array.from({ length: 2 }, () => generateImage({ model: MODELS.image, prompt: TEXTURE_SYSTEM + prompt })));
  const rot = async (img: Uint8Array) => new Uint8Array(await sharp(img).rotate(180).png().toBuffer());
  const bytes = await blendTiles([a.image.uint8Array, b.image.uint8Array, await rot(b.image.uint8Array), await rot(a.image.uint8Array)]);
  const url = await saveMedia("looks", `${id}.jpg`, bytes);
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now().toString(36)}`;
}

// Feathered 2x2 torus blend. Each tile is enlarged by the overlap and placed
// on a 2x2 grid; where tiles meet (including across the wrap-around edges)
// their weights ramp linearly and sum to one, so there are no seams and no
// mirror symmetry. Raw RGB, done in JS: ~10M pixels, well under a second.
async function blendTiles(pngs: Uint8Array[]): Promise<Uint8Array> {
  const sharp = (await import("sharp")).default;
  const W = TILE + OVERLAP; // enlarged tile
  const tiles = await Promise.all(pngs.map((p) => sharp(p).resize(W, W, { fit: "cover" }).removeAlpha().raw().toBuffer()));
  matchTone(tiles);
  const N = TILE * 2;
  const out = Buffer.alloc(N * N * 3);
  const half = OVERLAP / 2;
  const origins: [number, number][] = [
    [0, 0],
    [TILE, 0],
    [0, TILE],
    [TILE, TILE],
  ];
  // Weight along one axis for a tile whose nominal span starts at `o`, for torus coordinate `x`.
  const ramp = (x: number, o: number): [number, number] => {
    // distance into the enlarged span [o - half, o + TILE + half), wrapped
    const d = (((x - (o - half)) % N) + N) % N;
    if (d >= W) return [0, 0];
    const w = d < OVERLAP ? d / OVERLAP : d > W - OVERLAP ? (W - d) / OVERLAP : 1;
    return [w, d];
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let r = 0,
        g = 0,
        b = 0,
        wsum = 0;
      for (let k = 0; k < 4; k++) {
        const [ox, oy] = origins[k];
        const [wx, dx] = ramp(x, ox);
        if (!wx) continue;
        const [wy, dy] = ramp(y, oy);
        if (!wy) continue;
        const w = wx * wy;
        const i = (dy * W + dx) * 3;
        const t = tiles[k];
        r += t[i] * w;
        g += t[i + 1] * w;
        b += t[i + 2] * w;
        wsum += w;
      }
      const j = (y * N + x) * 3;
      if (wsum > 0) {
        out[j] = r / wsum;
        out[j + 1] = g / wsum;
        out[j + 2] = b / wsum;
      }
    }
  }
  const jpg = await sharp(out, { raw: { width: N, height: N, channels: 3 } }).resize(OUT, OUT).jpeg({ quality: 78 }).toBuffer();
  return new Uint8Array(jpg);
}

// The model's four renderings drift in brightness and color. Bring every
// tile's per-channel mean and spread to the group average so the quadrants
// read as one surface rather than four patches.
function matchTone(tiles: Buffer[]) {
  const stats = tiles.map((t) => {
    const sum = [0, 0, 0],
      sq = [0, 0, 0];
    const n = t.length / 3;
    for (let i = 0; i < t.length; i += 3)
      for (let c = 0; c < 3; c++) {
        sum[c] += t[i + c];
        sq[c] += t[i + c] * t[i + c];
      }
    const mean = sum.map((v) => v / n);
    const std = sq.map((v, c) => Math.sqrt(Math.max(1, v / n - mean[c] * mean[c])));
    return { mean, std };
  });
  const target = {
    mean: [0, 1, 2].map((c) => stats.reduce((a, s) => a + s.mean[c], 0) / stats.length),
    std: [0, 1, 2].map((c) => stats.reduce((a, s) => a + s.std[c], 0) / stats.length),
  };
  tiles.forEach((t, k) => {
    const { mean, std } = stats[k];
    const gain = [0, 1, 2].map((c) => target.std[c] / std[c]);
    for (let i = 0; i < t.length; i += 3)
      for (let c = 0; c < 3; c++) {
        const v = (t[i + c] - mean[c]) * gain[c] + target.mean[c];
        t[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
  });
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
}

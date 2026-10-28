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
- Colours are CSS hex. background is land. water is the fill of seas and lakes; waterLine is rivers and shorelines. wood, park, residential, building are fills. roadMajor/roadMinor/roadCasing/rail/boundary are strokes. label and labelHalo are text and its halo; the halo must contrast with the label and sit close to the land colour.
- hillshade blends Natural Earth relief at low zoom (true for printed, terrain or antique looks); hillshadeOpacity 0.2 to 0.5 when on.
- landcoverOpacity and roadOpacity are 0 to 1.
- labelDensity: sparse for painterly or poster looks, dense for reference maps.
- edgeBleed 0.5 to 0.9 gives soft darker pooling along water and forest edges, the signature of watercolour, gouache and ink wash. 0 for crisp or digital looks.
- lineStyle sketch gives broken, slightly blurred strokes (pen, pencil, etching). solid otherwise.
- roadStyle: cased is the normal outlined road; single is one thin stroke (poster, minimal, painterly); hidden removes roads entirely (watercolour, very abstract).
- buildings false for painterly or poster looks.
- halftone draws a dot screen over the map: enabled for photocopy, newsprint, risograph, comic looks; size 3 to 6, opacity 0.15 to 0.5. enabled false otherwise.
- grain 0.1 to 0.35 adds film grain or paper noise; 0 for clean looks.
- saturation applies to relief imagery, -1 is monochrome.
- labelTransform and labelSpacing shape city labels (uppercase with 0.1 to 0.2 spacing for posters and antique maps).
- textureOverlay: a generated seamless tile laid over the map in screen space. Use it for paper, canvas, watercolour wash, photocopy toner, blueprint fibre, fabric. The prompt must describe only a flat surface texture: no objects, no scenery, no text, no map. opacity 0.2 to 0.6; blend multiply on light looks, screen or soft-light on dark looks; scale 384 to 768. enabled false for flat digital looks.

Design rules: the look must read at zoom 2 (continents) and zoom 13 (streets). Keep contrast between land and water. Keep roads subtler than water. Never use pure #000000 land unless the brief asks for it. name is two or three words; mood is a short phrase.`;

const TEXTURE_SYSTEM = "Seamless tileable flat surface texture, top-down, evenly lit, no vignette, no border, no objects, no text, no watermark, fills the whole frame edge to edge: ";

export async function designLook(prompt: string, owner?: string): Promise<Theme> {
  const examples = THEMES.slice(0, 2)
    .map((t) => JSON.stringify({ name: t.name, background: t.background, water: t.water, roadMajor: t.roadMajor, label: t.label, mood: t.mood }))
    .join("\n");
  const result = await generateText({
    model: MODELS.extract,
    system: SYSTEM,
    output: Output.object({ schema: LookDesignSchema }),
    prompt: `Brief: ${prompt}\n\nFor calibration, two built-in looks (partial): \n${examples}`,
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
    createdAt: new Date().toISOString(),
    owner,
    texture: null,
    halftone: halftone.enabled ? { size: clamp(halftone.size, 2, 12), opacity: clamp(halftone.opacity, 0.05, 0.8), color: halftone.color } : null,
  };
  if (textureOverlay.enabled && textureOverlay.prompt.trim()) {
    try {
      const { image } = await generateImage({ model: MODELS.image, prompt: TEXTURE_SYSTEM + textureOverlay.prompt });
      const bytes = await makeSeamless(image.uint8Array);
      const url = await saveMedia("looks", `${id}.jpg`, bytes);
      look.texture = { url, opacity: clamp(textureOverlay.opacity, 0.05, 0.9), blend: textureOverlay.blend, scale: clamp(textureOverlay.scale, 128, 1024) };
    } catch (err) {
      // A look without its texture is still a look.
      console.warn("texture generation failed", (err as Error).message);
    }
  }
  return look;
}

// Mirror the tile into a 2x2 so every edge meets its own reflection: seamless
// regardless of what the model painted, at the cost of visible symmetry at
// large scale, which the overlay opacity hides.
async function makeSeamless(png: Uint8Array): Promise<Uint8Array> {
  const sharp = (await import("sharp")).default;
  const S = 512;
  const base = await sharp(png).resize(S, S, { fit: "cover" }).toBuffer();
  const flop = await sharp(base).flop().toBuffer();
  const flip = await sharp(base).flip().toBuffer();
  const both = await sharp(base).flip().flop().toBuffer();
  const out = await sharp({ create: { width: S * 2, height: S * 2, channels: 3, background: "#808080" } })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: flop, left: S, top: 0 },
      { input: flip, left: 0, top: S },
      { input: both, left: S, top: S },
    ])
    .jpeg({ quality: 82 })
    .toBuffer();
  return new Uint8Array(out);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
}

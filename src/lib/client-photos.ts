import exifr from "exifr";
import type { PhotoMeta } from "./ingest/photos";

// Browser side: read EXIF before the image is re-encoded (which strips it),
// then downsize so a folder of phone photos fits the request limit.
const MAX_EDGE = 1800;

export async function preparePhotos(files: File[]): Promise<{ files: File[]; meta: Record<string, PhotoMeta> }> {
  const out: File[] = [];
  const meta: Record<string, PhotoMeta> = {};
  for (const f of files) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      out.push(f);
      continue;
    }
    try {
      const x = (await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "Make", "Model"], reviveValues: false })) as Record<string, string> | undefined;
      const gps = await exifr.gps(f).catch(() => null);
      const raw = x?.DateTimeOriginal ?? x?.CreateDate;
      meta[f.name] = {
        lat: gps?.latitude ?? null,
        lng: gps?.longitude ?? null,
        time: exifTimeToIso(raw, x?.OffsetTimeOriginal ?? null, gps?.longitude ?? null),
        make: x?.Make ?? null,
        model: x?.Model ?? null,
      };
    } catch {}
    try {
      out.push(await downsize(f));
    } catch {
      out.push(f);
    }
  }
  return { files: out, meta };
}

async function downsize(f: File): Promise<File> {
  const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && f.size < 2_000_000) return f;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.86));
  return new File([blob], f.name.replace(/\.(png|webp)$/i, ".jpg"), { type: "image/jpeg" });
}

function exifTimeToIso(raw: string | undefined, offset: string | null, lng: number | null): string | null {
  if (!raw) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  let offMin = 0;
  const om = offset ? /^([+-])(\d{2}):(\d{2})$/.exec(offset) : null;
  if (om) offMin = (om[1] === "-" ? -1 : 1) * (Number(om[2]) * 60 + Number(om[3]));
  else if (lng != null) offMin = Math.round(lng / 15) * 60;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - offMin * 60000).toISOString();
}

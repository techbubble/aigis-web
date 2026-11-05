import { promises as fs } from "node:fs";
import path from "node:path";

// Where photo derivatives (thumb + full) live. Blob in production, the local
// filesystem otherwise. Sample datasets write into public/ so they ship with
// the repo and need no storage at runtime.
// A token (classic store) anywhere, or an OIDC store id when running on Vercel, means Blob is
// connected. Locally an OIDC store cannot authenticate, so development stays on the filesystem.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN || (!!process.env.BLOB_STORE_ID && !!process.env.VERCEL);
const MEDIA_DIR = path.join(process.cwd(), ".data", "media");

export async function saveMedia(datasetId: string, name: string, bytes: Uint8Array, contentType = "image/jpeg"): Promise<string> {
  if (datasetId.startsWith("sample-")) {
    const dir = path.join(process.cwd(), "public", "samples", datasetId.slice(7), "media");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), bytes);
    return `/samples/${datasetId.slice(7)}/media/${name}`;
  }
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const r = await put(`aigis/media/${datasetId}/${name}`, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
    return r.url;
  }
  const dir = path.join(MEDIA_DIR, datasetId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), bytes);
  return `/api/media/${datasetId}/${name}`;
}

export async function readLocalMedia(datasetId: string, name: string): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(datasetId) || !/^[a-zA-Z0-9_.-]+$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(MEDIA_DIR, datasetId, name));
  } catch {
    return null;
  }
}

// Removes stored derivatives by the URLs recorded on events. Best effort.
export async function deleteMedia(datasetId: string, urls: string[]): Promise<void> {
  if (!urls.length) return;
  if (useBlob && urls.some((u) => /^https?:/.test(u))) {
    try {
      const { del } = await import("@vercel/blob");
      await del(urls.filter((u) => /^https?:/.test(u)));
    } catch {
      /* already gone */
    }
  }
  const dir = datasetId.startsWith("sample-") ? path.join(process.cwd(), "public", "samples", datasetId.slice(7), "media") : path.join(MEDIA_DIR, datasetId);
  await Promise.all(
    urls
      .filter((u) => !/^https?:/.test(u))
      .map((u) => u.split("/").pop() ?? "")
      .filter((n) => /^[a-zA-Z0-9_.-]+$/.test(n))
      .map((n) => fs.rm(path.join(dir, n), { force: true })),
  );
}

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Dataset } from "./types";

// Blob in production (BLOB_READ_WRITE_TOKEN set), local filesystem otherwise.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const DATA_DIR = path.join(process.cwd(), ".data", "datasets");
const PREFIX = "aigis/datasets";

type Meta = Pick<Dataset, "id" | "name" | "createdAt" | "savedAt" | "owner" | "position"> & { count: number };

export async function saveDataset(ds: Dataset): Promise<void> {
  const body = JSON.stringify(ds);
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    await put(`${PREFIX}/${ds.id}.json`, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${ds.id}.json`), body);
}

// Pre-baked sample datasets ship in the repo so demos open instantly.
async function loadBundledSample(id: string): Promise<Dataset | null> {
  if (!id.startsWith("sample-")) return null;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "public", "samples", id.slice(7), "dataset.json"), "utf8");
    return JSON.parse(raw) as Dataset;
  } catch {
    return null;
  }
}

// For bundled samples the content shipped in the repo is canonical; a stored
// copy only carries what the creator changed in Studio (look, markers,
// title, order). Otherwise a copy ingested before the sample was improved
// keeps serving stale events and media.
export async function loadDataset(id: string): Promise<Dataset | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const stored = await loadStoredDataset(id);
  const bundled = await loadBundledSample(id);
  if (bundled && stored) {
    const { theme, marker, name, subtitle, position, savedAt, owner, editors } = stored;
    return { ...bundled, theme: theme ?? bundled.theme, marker: marker ?? bundled.marker, name: name ?? bundled.name, subtitle: subtitle ?? bundled.subtitle, position, savedAt: savedAt ?? bundled.savedAt, owner: owner ?? bundled.owner, editors: editors ?? bundled.editors };
  }
  return stored ?? bundled;
}

async function loadStoredDataset(id: string): Promise<Dataset | null> {
  if (useBlob) {
    const { head } = await import("@vercel/blob");
    try {
      const info = await head(`${PREFIX}/${id}.json`);
      const res = await fetch(info.url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as Dataset;
    } catch {
      return null;
    }
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as Dataset;
  } catch {
    return null;
  }
}

export async function listDatasets(): Promise<Meta[]> {
  const out: Meta[] = [];
  // Samples are listed from their own cards, not here.
  if (useBlob) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${PREFIX}/` });
    for (const b of blobs) {
      const id = b.pathname.slice(PREFIX.length + 1).replace(/\.json$/, "");
      const ds = await loadDataset(id);
      if (ds) out.push({ id: ds.id, name: ds.name, createdAt: ds.createdAt, savedAt: ds.savedAt, owner: ds.owner, position: ds.position, count: ds.events.length });
    }
  } else {
    try {
      const files = await fs.readdir(DATA_DIR);
      for (const f of files.filter((f) => f.endsWith(".json"))) {
        const ds = await loadDataset(f.replace(/\.json$/, ""));
        if (ds) out.push({ id: ds.id, name: ds.name, createdAt: ds.createdAt, savedAt: ds.savedAt, owner: ds.owner, position: ds.position, count: ds.events.length });
      }
    } catch {
      /* no data dir yet */
    }
  }
  // Explicit positions first (as set in Studio), then newest first.
  return out.sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || b.createdAt.localeCompare(a.createdAt));
}

export async function deleteDataset(id: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return;
  if (useBlob) {
    const { del, head } = await import("@vercel/blob");
    try {
      const info = await head(`${PREFIX}/${id}.json`);
      await del(info.url);
    } catch {
      /* missing */
    }
    // Photo derivatives for this story.
    try {
      const { list } = await import("@vercel/blob");
      const media = await list({ prefix: `aigis/media/${id}/` });
      if (media.blobs.length) await del(media.blobs.map((b) => b.url));
    } catch {
      /* none */
    }
    return;
  }
  await fs.rm(path.join(DATA_DIR, `${id}.json`), { force: true });
  await fs.rm(path.join(process.cwd(), ".data", "media", id), { recursive: true, force: true });
}

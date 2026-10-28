import { promises as fs } from "node:fs";
import path from "node:path";
import { ThemeSchema, type Theme } from "./map/styles";

// Looks designed in Studio. Blob in production, local files otherwise.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const DIR = path.join(process.cwd(), ".data", "looks");
const PREFIX = "aigis/looks";

export async function saveLook(look: Theme): Promise<void> {
  const body = JSON.stringify(look);
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    await put(`${PREFIX}/${look.id}.json`, body, { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${look.id}.json`), body);
}

export async function loadLook(id: string): Promise<Theme | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  try {
    let raw: string;
    if (useBlob) {
      const { head } = await import("@vercel/blob");
      const info = await head(`${PREFIX}/${id}.json`);
      const res = await fetch(info.url, { cache: "no-store" });
      if (!res.ok) return null;
      raw = await res.text();
    } else {
      raw = await fs.readFile(path.join(DIR, `${id}.json`), "utf8");
    }
    const parsed = ThemeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function listLooks(): Promise<Theme[]> {
  const out: Theme[] = [];
  if (useBlob) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${PREFIX}/` });
    for (const b of blobs) {
      const look = await loadLook(b.pathname.slice(PREFIX.length + 1).replace(/\.json$/, ""));
      if (look) out.push(look);
    }
  } else {
    try {
      for (const f of (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"))) {
        const look = await loadLook(f.replace(/\.json$/, ""));
        if (look) out.push(look);
      }
    } catch {
      /* none yet */
    }
  }
  return out.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
}

export async function deleteLook(id: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return;
  const look = await loadLook(id);
  if (look?.texture?.url) {
    const { deleteMedia } = await import("./media");
    await deleteMedia("looks", [look.texture.url]);
  }
  if (useBlob) {
    const { del, head } = await import("@vercel/blob");
    try {
      const info = await head(`${PREFIX}/${id}.json`);
      await del(info.url);
    } catch {
      /* missing */
    }
    return;
  }
  await fs.rm(path.join(DIR, `${id}.json`), { force: true });
}

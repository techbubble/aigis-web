import Papa from "papaparse";
import type { SourceFile } from "../types";

export type Row = Record<string, string | number | null>;

export type ParsedSource =
  | { kind: "table"; file: SourceFile; headers: string[]; rows: Row[] }
  | { kind: "text"; file: SourceFile; text: string }
  | { kind: "image"; file: SourceFile; data: Uint8Array; mediaType: string };

const TEXT_EXT = new Set(["txt", "md", "markdown", "html", "htm", "rtf", "log"]);
const IMG_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function parseFile(name: string, bytes: Uint8Array, mediaType: string): Promise<ParsedSource> {
  const ext = extOf(name);
  const base: SourceFile = { name, kind: "text", bytes: bytes.byteLength };

  if (ext === "csv" || ext === "tsv") {
    const text = new TextDecoder().decode(bytes);
    const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    const headers = parsed.meta.fields ?? [];
    return { kind: "table", file: { ...base, kind: "table", rows: parsed.data.length }, headers, rows: parsed.data };
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(bytes, { type: "array", cellDates: true });
    const rows: Row[] = [];
    let headers: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: false });
      if (json.length && !headers.length) headers = Object.keys(json[0]);
      for (const r of json) rows.push({ __sheet: sheetName, ...r });
    }
    if (headers.length && !headers.includes("__sheet")) headers = ["__sheet", ...headers];
    return { kind: "table", file: { ...base, kind: "table", rows: rows.length }, headers, rows };
  }

  if (ext === "json" || ext === "geojson") {
    const text = new TextDecoder().decode(bytes);
    try {
      const j = JSON.parse(text);
      const arr = Array.isArray(j) ? j : Array.isArray(j?.features) ? j.features : Array.isArray(j?.data) ? j.data : null;
      if (arr && arr.length && typeof arr[0] === "object") {
        const rows: Row[] = arr.map((o: Record<string, unknown>) => flatten(o));
        const headers = Array.from(new Set<string>(rows.flatMap((r) => Object.keys(r))));
        return { kind: "table", file: { ...base, kind: "table", rows: rows.length }, headers, rows };
      }
    } catch {
      /* fall through to text */
    }
    return { kind: "text", file: { ...base, kind: "json" }, text };
  }

  if (ext === "pdf" || mediaType === "application/pdf") {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(bytes, { mergePages: true });
    return { kind: "text", file: { ...base, kind: "pdf" }, text: Array.isArray(text) ? text.join("\n") : text };
  }

  if (IMG_EXT.has(ext) || mediaType.startsWith("image/")) {
    return { kind: "image", file: { ...base, kind: "image" }, data: bytes, mediaType: mediaType || `image/${ext}` };
  }

  if (TEXT_EXT.has(ext) || mediaType.startsWith("text/") || !ext) {
    const text = new TextDecoder().decode(bytes);
    return { kind: "text", file: base, text: ext === "html" || ext === "htm" ? stripHtml(text) : text };
  }

  // Unknown: try as text.
  return { kind: "text", file: base, text: new TextDecoder().decode(bytes) };
}

function flatten(o: Record<string, unknown>, prefix = "", out: Row = {}): Row {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v as Record<string, unknown>, key, out);
    else if (Array.isArray(v)) {
      // GeoJSON coordinates [lng, lat]
      if (key.endsWith("geometry.coordinates") && typeof v[0] === "number") {
        out["lng"] = v[0] as number;
        out["lat"] = v[1] as number;
      } else out[key] = JSON.stringify(v);
    } else out[key] = v as string | number | null;
  }
  return out;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Split long text on paragraph boundaries into ~maxChars chunks with overlap.
export function chunkText(text: string, maxChars = 7000, overlap = 400): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= maxChars) return clean ? [clean] : [];
  const paras = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > maxChars && cur) {
      chunks.push(cur);
      cur = cur.slice(-overlap) + "\n\n" + p;
    } else cur = cur ? cur + "\n\n" + p : p;
    while (cur.length > maxChars) {
      chunks.push(cur.slice(0, maxChars));
      cur = cur.slice(maxChars - overlap);
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

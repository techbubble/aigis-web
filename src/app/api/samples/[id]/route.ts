import { sampleById } from "@/lib/samples";
import { runIngest, type InputFile } from "@/lib/ingest/pipeline";
import { ndjsonStream } from "@/lib/ndjson";
import { loadDataset, saveDataset } from "@/lib/store";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MEDIA: Record<string, string> = { md: "text/markdown", csv: "text/csv", txt: "text/plain", json: "application/json", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

// POST /api/samples/:id  -> ingests the bundled sample (or returns the cached dataset).
// Pass ?force=1 to re-run extraction.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sample = sampleById(id);
  if (!sample) return Response.json({ error: "Unknown sample" }, { status: 404 });
  const url = new URL(req.url);
  const datasetId = `sample-${sample.id}`;
  const body = (await req.json().catch(() => ({}))) as { theme?: unknown };
  const theme = typeof body.theme === "string" ? body.theme : undefined;
  if (!url.searchParams.get("force")) {
    const existing = await loadDataset(datasetId);
    if (existing) {
      if (theme && existing.theme !== theme) {
        existing.theme = theme;
        await saveDataset(existing);
      }
      return ndjsonStream(async (emit) => {
        emit({ type: "status", message: "Loaded cached extraction", pct: 100 });
        emit({ type: "done", datasetId, summary: existing.summary });
      });
    }
  }
  const files: InputFile[] = await Promise.all(
    sample.files.map(async (f) => {
      const res = await fetch(`${url.origin}/samples/${sample.id}/${f}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Missing sample file ${f}`);
      return { name: f, bytes: new Uint8Array(await res.arrayBuffer()), mediaType: MEDIA[f.split(".").pop() ?? ""] ?? "text/plain" };
    }),
  );
  return ndjsonStream((emit) => runIngest({ id: datasetId, name: sample.title, files, theme: theme ?? sample.theme }, emit));
}

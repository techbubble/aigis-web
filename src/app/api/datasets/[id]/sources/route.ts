import { readMultipart, runIngest } from "@/lib/ingest/pipeline";
import { ndjsonStream } from "@/lib/ndjson";
import { loadDataset, saveDataset } from "@/lib/store";
import { canEdit, currentUser } from "@/lib/auth";
import { deleteMedia } from "@/lib/media";
import { detectInsights, summarize } from "@/lib/analysis/insights";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/datasets/:id/sources  (multipart: files, meta?, docDate?)
// Adds documents to an existing story. Streams progress; "done" when merged.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await loadDataset(id);
  if (!ds) return Response.json({ error: "Not found" }, { status: 404 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  if (!canEdit(ds, user)) return Response.json({ error: "Not allowed" }, { status: 403 });
  const form = await req.formData();
  const { files, docDate } = readMultipart(form);
  if (!files.length) return Response.json({ error: "No files" }, { status: 400 });
  const inputs = await Promise.all(files);
  return ndjsonStream((emit) => runIngest({ name: ds.name, files: inputs, docDate, into: ds }, emit));
}

// DELETE /api/datasets/:id/sources?name=<file>  Removes the document and every event it produced.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await loadDataset(id);
  if (!ds) return Response.json({ error: "Not found" }, { status: 404 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  if (!canEdit(ds, user)) return Response.json({ error: "Not allowed" }, { status: 403 });
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!ds.sources.some((s) => s.name === name)) return Response.json({ error: "No such source" }, { status: 404 });
  const gone = ds.events.filter((e) => e.sourceFile === name);
  await deleteMedia(id, gone.filter((e) => e.media).flatMap((e) => [e.media!.thumb, e.media!.full]));
  ds.events = ds.events.filter((e) => e.sourceFile !== name);
  ds.sources = ds.sources.filter((s) => s.name !== name);
  ds.summary = summarize(ds.events, ds.summary.dropped);
  ds.insights = detectInsights({ events: ds.events, summary: ds.summary });
  ds.savedAt = new Date().toISOString();
  await saveDataset(ds);
  return Response.json({ ok: true, removed: gone.length, count: ds.events.length });
}

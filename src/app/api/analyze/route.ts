import { Output, streamText } from "ai";
import { MODELS } from "@/lib/ai/models";
import { BriefSchema, type BriefSource } from "@/lib/ai/brief";
import { research, researchQuestion, type ResearchNote } from "@/lib/ai/research";
import { describeWindow, windowStats } from "@/lib/analysis/window";
import { loadDataset } from "@/lib/store";
import { applyFilter, EMPTY_FILTER, inBounds, type Filter } from "@/components/explorer-state";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const day = (t: number) => new Date(t).toISOString().slice(0, 10);

// POST /api/analyze { datasetId, from, to, bbox?, filter?, contexts? } -> a
// briefing on the events inside the time window and the map region (bbox is
// what the map shows), streamed as NDJSON: first {"sources": [...]} for the
// citations, then {"brief": <partial Brief>} lines as the object grows, and
// {"error": "..."} if it stops. Findings are cards ranked by priority, each
// with its dates, places and the number that proves it.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { datasetId?: string; from?: number; to?: number; bbox?: number[] | null; filter?: Partial<Filter>; contexts?: string[] } | null;
  if (!body?.datasetId || typeof body.from !== "number" || typeof body.to !== "number") return Response.json({ error: "datasetId, from and to required" }, { status: 400 });
  const ds = await loadDataset(body.datasetId);
  if (!ds) return Response.json({ error: "Dataset not found" }, { status: 404 });

  const filter: Filter = { ...EMPTY_FILTER, ...(body.filter ?? {}), timeRange: null };
  const bbox = Array.isArray(body.bbox) && body.bbox.length === 4 && body.bbox.every((n) => typeof n === "number") ? (body.bbox as [number, number, number, number]) : null;
  const events = inBounds(applyFilter(ds, filter), bbox);
  const stats = windowStats(ds, body.from, body.to, events, bbox);
  const enabled = new Set(body.contexts ?? []);
  const topics = (ds.contexts ?? []).filter((t) => enabled.has(t.id)).slice(0, 3);

  let notes: ResearchNote[] = [];
  if (topics.length && stats.count > 0) {
    const ctx = {
      name: ds.name,
      from: day(stats.from),
      to: day(stats.to),
      places: stats.byPlace.map((p) => p.name),
      categories: stats.byCategory.map((c) => c.name),
    };
    notes = (await Promise.allSettled(topics.map((t) => research(t, researchQuestion(t, ctx))))).flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  }

  const cites: BriefSource[] = [];
  const notesText = notes
    .map((n) => {
      const refs = n.sources.slice(0, 4).map((s) => {
        cites.push({ n: cites.length + 1, ...s });
        return `[${cites.length}]`;
      });
      return `### ${n.topic} ${refs.join("")}\n${n.text}`;
    })
    .join("\n\n");

  const system = `You are AIGIS, a geographic intelligence analyst. The viewer has selected a time window on a map of "${ds.name}"${bbox ? " and is looking at one region of it" : ""}, and wants to know what the events inside that window and region mean. Only those events are described below; the rest of the dataset is out of view.

Write the briefing as structured findings, not prose. Each finding is one card: a title with a figure, one or two sentences of proof, the dates it is about, the places it names, and the single number that makes the point. The number is whatever quantifies the finding: a measured value when the events carry one; otherwise a count, a share, a span in days, a rank, or the change against the previous window. Leave it empty only when nothing quantifies the finding. Rank by priority: high when it changes what a reader would conclude about this region in this window, medium when notable, low when background. Compare with the previous window where the numbers allow it. Name leaders and laggards by place.
${notesText ? "\nThe research notes are outside context the viewer switched on. Findings that draw on them use kind 'context' and list the citation numbers that support them. Connect the outside facts to what the map shows.\n" : ""}
Rules: never invent figures; everything must trace to the statistics or the notes. Dates come from the statistics, not from today. American spelling. No preamble.`;

  const prompt = `Dataset: ${ds.name}. Sources: ${ds.sources.map((f) => f.name).join(", ")}.\n\nWindow statistics:\n${describeWindow(stats)}${notesText ? `\n\nResearch notes from outside sources (${topics.map((t) => t.label).join("; ")}):\n${notesText}` : "\n\nNo outside context sources are enabled."}`;

  const result = streamText({ model: MODELS.chat, system, prompt, reasoning: "low", output: Output.object({ schema: BriefSchema }) });
  const stream = new ReadableStream<Uint8Array>({
    async start(ctl) {
      const enc = new TextEncoder();
      const line = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      line({ sources: cites });
      try {
        for await (const partial of result.partialOutputStream) line({ brief: partial });
      } catch (err) {
        line({ error: (err as Error).message });
      }
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

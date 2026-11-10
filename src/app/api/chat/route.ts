import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import { FocusMapInput } from "@/lib/ai/tools";
import { loadDataset } from "@/lib/store";
import type { Dataset, GeoEvent } from "@/lib/types";
import { bucketLabel } from "@/lib/analysis/insights";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const fmtDay = (t: number) => new Date(t).toISOString().slice(0, 10);

function compactEvent(e: GeoEvent) {
  return `${e.id}|${fmtDay(e.t)}${e.tEnd ? ".." + fmtDay(e.tEnd) : ""}|${e.category}|${e.place}|${e.title}${e.value != null ? `|${e.value}${e.unit ? " " + e.unit : ""}` : ""}`;
}

function systemPrompt(ds: Dataset) {
  const s = ds.summary;
  const maxInline = 400;
  const inline = ds.events.length <= maxInline ? ds.events : [];
  const insights = (ds.insights ?? []).slice(0, 15).map((i) => `- [${i.kind}] ${i.title}: ${i.detail}`).join("\n");
  return `You are AIGIS, an autonomous geospatial intelligence analyst. The user is looking at an animated map of a dataset and talks to you to explore it. Be concrete, cite places, dates and counts. Keep answers under 150 words unless asked for detail. Never invent events that are not in the data; if you need data you do not have inline, call queryEvents.

When the user asks to see, show, replay, animate, focus, zoom or compare something, call focusMap so the map changes. When you reference a specific subset of events, call focusMap with their ids so they are highlighted. One focusMap call per answer is usually right; put it before your prose. Mention cause and effect only as hypotheses backed by timing and location, and say so.

Dataset: "${ds.name}" with ${s.count} located, dated events from ${s.tMin != null ? fmtDay(s.tMin) : "?"} to ${s.tMax != null ? fmtDay(s.tMax) : "?"}.
Sources: ${ds.sources.map((f) => `${f.name} (${f.kind}${f.rows ? `, ${f.rows} rows` : ""})`).join("; ")}.
Dropped during extraction: ${s.dropped.noTime} without a date, ${s.dropped.noLocation} without a location, ${s.dropped.lowConfidence} low confidence.
Categories: ${s.categories.map((c) => `${c.name} (${c.count})`).join(", ")}.
Top places: ${s.topPlaces.slice(0, 15).map((p) => `${p.name} (${p.count})`).join(", ")}.

Precomputed findings from the pattern engine (statistical, verify before asserting):
${insights || "- none"}

${inline.length ? `All events (id|date|category|place|title|value):\n${inline.map(compactEvent).join("\n")}` : `The dataset has ${ds.events.length} events, too many to inline. Use queryEvents to retrieve what you need.`}`;
}

export async function POST(req: Request) {
  const { messages, datasetId }: { messages: UIMessage[]; datasetId: string } = await req.json();
  const ds = await loadDataset(datasetId);
  if (!ds) return Response.json({ error: "Dataset not found" }, { status: 404 });

  const result = streamText({
    model: MODELS.chat,
    system: systemPrompt(ds),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    // Answers should start within seconds; the evidence is already in the prompt.
    reasoning: "low",
    tools: {
      focusMap: tool({
        description:
          "Change what the map shows: filter by time, category, place or specific event ids, move the camera, and optionally start the animation. Executes on the client.",
        inputSchema: FocusMapInput,
      }),
      queryEvents: tool({
        description: "Search the dataset. Returns matching events (up to limit) plus counts by category and by time bucket.",
        inputSchema: z.object({
          text: z.string().nullable().describe("Case-insensitive substring to match in title, summary, place, entities or category"),
          categories: z.array(z.string()).nullable(),
          placeContains: z.string().nullable(),
          from: z.string().nullable().describe("ISO date lower bound"),
          to: z.string().nullable().describe("ISO date upper bound"),
          minValue: z.number().nullable(),
          sortBy: z.enum(["time", "value"]),
          limit: z.number().describe("Max events to return, 1 to 200"),
        }),
        execute: async (q) => {
          const from = q.from ? Date.parse(q.from) : -Infinity;
          const to = q.to ? Date.parse(q.to) : Infinity;
          const txt = q.text?.toLowerCase();
          const pc = q.placeContains?.toLowerCase();
          const cats = q.categories?.map((c) => c.toLowerCase());
          let list = ds.events.filter(
            (e) =>
              e.t >= from &&
              e.t <= to &&
              (!cats || cats.includes(e.category)) &&
              (!pc || e.place.toLowerCase().includes(pc)) &&
              (q.minValue == null || (e.value ?? -Infinity) >= q.minValue) &&
              (!txt || [e.title, e.summary, e.place, e.category, ...e.entities].join(" ").toLowerCase().includes(txt)),
          );
          const total = list.length;
          if (q.sortBy === "value") list = [...list].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
          const byCat: Record<string, number> = {};
          const byBucket: Record<string, number> = {};
          const span = list.length ? list[list.length - 1].t - list[0].t : 0;
          const bucketMs = span > 3 * 365 * 86400000 ? 365 * 86400000 : span > 120 * 86400000 ? 30 * 86400000 : 86400000;
          for (const e of list) {
            byCat[e.category] = (byCat[e.category] ?? 0) + 1;
            const k = bucketMs === 86400000 ? fmtDay(e.t) : bucketMs === 30 * 86400000 ? fmtDay(e.t).slice(0, 7) : fmtDay(e.t).slice(0, 4);
            byBucket[k] = (byBucket[k] ?? 0) + 1;
          }
          const lim = Math.max(1, Math.min(200, q.limit || 50));
          return {
            total,
            bucket: bucketLabel(bucketMs === 365 * 86400000 ? 30 * 86400000 : bucketMs) === "month" ? "month" : bucketMs === 365 * 86400000 ? "year" : "day",
            byCategory: byCat,
            byBucket,
            events: list.slice(0, lim).map((e) => ({
              id: e.id,
              date: fmtDay(e.t),
              end: e.tEnd ? fmtDay(e.tEnd) : null,
              title: e.title,
              place: e.place,
              lat: e.lat,
              lng: e.lng,
              category: e.category,
              value: e.value,
              unit: e.unit,
              summary: e.summary.slice(0, 240),
              source: e.sourceFile,
            })),
          };
        },
      }),
      getEvent: tool({
        description: "Fetch the full record for one event id, including its summary, entities and source quote.",
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => ds.events.find((e) => e.id === id) ?? { error: "no such event" },
      }),
      getInsights: tool({
        description: "Return all precomputed statistical findings: bursts, hotspots, outliers, lead/lag correlations and gaps, with the event ids involved.",
        inputSchema: z.object({ kind: z.enum(["all", "anomaly", "cluster", "correlation", "gap", "trend"]) }),
        execute: async ({ kind }) => (ds.insights ?? []).filter((i) => kind === "all" || i.kind === kind),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

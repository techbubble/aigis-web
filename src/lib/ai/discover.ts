import { generateText, Output } from "ai";
import { z } from "zod";
import { nanoid } from "nanoid";
import { MODELS } from "./models";
import { discoveryEvidence } from "../analysis/discover";
import type { Dataset, Discovery } from "../types";

const Schema = z.object({
  discoveries: z.array(
    z.object({
      kind: z.enum(["turning-point", "divergence", "trend", "connection", "outlier", "leader"]),
      headline: z.string().describe("Under 14 words, a finding with a figure in it, not a topic"),
      detail: z.string().describe("Two or three sentences with the specific places, dates and numbers that prove it, and what it suggests"),
      timeRange: z.array(z.string()).describe("Two ISO dates [from, to] the finding is about"),
      places: z.array(z.string()).describe("Place names exactly as they appear in the evidence, up to six"),
      categories: z.array(z.string()).describe("Category names exactly as in the evidence, if the finding is about them"),
      eventIds: z.array(z.string()).describe("Event ids from the evidence [in brackets] that prove it, up to eight"),
      confidence: z.number().describe("0 to 1"),
    }),
  ),
});

// The discovery pass: read the computed evidence for the whole story and
// write the handful of findings a good analyst would lead with.
export async function discover(ds: Pick<Dataset, "name" | "events" | "summary" | "insights" | "sources">): Promise<Discovery[]> {
  const evidence = discoveryEvidence(ds);
  const { output } = await generateText({
    model: MODELS.chat,
    output: Output.object({ schema: Schema }),
    system: `You are AIGIS, a geographic intelligence analyst. You are handed computed evidence about a set of located, dated events and you write the findings a reader should see first: five to eight of them, each a pattern or a connection that is meaningful, specific and surprising enough to be worth a sentence. Look for: turning points (when and where a trend reversed), divergence (places or categories that moved apart), leaders and laggards, connections between what the documents claimed and what the numbers then did, and outliers that the statistics flag. Every finding must carry figures, places and dates from the evidence; never invent. Prefer findings that span sources. Findings are about the world the events describe, never about how the documents or events are distributed in time. Treat the pattern engine's bursts as hints to look at a period, not as findings in themselves. Order by importance.`,
    prompt: `Story: ${ds.name}\nSources: ${ds.sources.map((f) => `${f.name} (${f.kind})`).join(", ")}\n\nEvidence:\n${evidence}`,
    reasoning: "low",
  });
  const ids = new Set(ds.events.map((e) => e.id));
  return output.discoveries.slice(0, 8).map((d) => ({
    id: nanoid(6),
    kind: d.kind,
    headline: d.headline,
    detail: d.detail,
    timeRange: d.timeRange.length === 2 && d.timeRange.every((x) => !Number.isNaN(Date.parse(x))) ? [d.timeRange[0], d.timeRange[1]] : null,
    places: d.places.slice(0, 6),
    categories: d.categories.slice(0, 6),
    eventIds: d.eventIds.filter((i) => ids.has(i)).slice(0, 8),
    confidence: Math.max(0, Math.min(1, d.confidence)),
  }));
}

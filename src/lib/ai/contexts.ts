import { generateText, Output } from "ai";
import { z } from "zod";
import { MODELS } from "./models";
import type { ContextTopic, Dataset } from "../types";

const Schema = z.object({
  topics: z.array(
    z.object({
      id: z.string().describe("short kebab-case id, e.g. mortgage-rates"),
      label: z.string().describe("Under six words, e.g. 'Mortgage rates (Freddie Mac PMMS)'"),
      why: z.string().describe("One sentence: what this would explain about the events"),
      sources: z.array(z.string()).describe("Two or three named public sources: an index, a government series, an industry publication"),
    }),
  ),
});

// After extraction, propose the outside sources that would explain the
// events. The user turns them on; nothing is fetched until they do.
export async function proposeContexts(ds: Pick<Dataset, "name" | "sources" | "summary" | "events">): Promise<ContextTopic[]> {
  const s = ds.summary;
  const sample = ds.events
    .filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 25)) === 0)
    .slice(0, 25)
    .map((e) => `${e.start.slice(0, 10)} ${e.place}: ${e.title}`)
    .join("\n");
  const { output } = await generateText({
    model: MODELS.extract,
    output: Output.object({ schema: Schema }),
    system:
      "You advise an analyst who has a map of located, dated events and wants to understand why they happened. Propose four to six outside context topics, each a public, citable source of facts that would color or explain these events: industry indices, government statistics, regulator or central bank actions, weather and disasters, news beats. Prefer topics with figures by place and date. Skip anything the data already contains.",
    prompt: `Dataset: ${ds.name}\nSources: ${ds.sources.map((f) => f.name).join(", ")}\nSpan: ${s.tMin != null ? new Date(s.tMin).toISOString().slice(0, 10) : "?"} to ${s.tMax != null ? new Date(s.tMax).toISOString().slice(0, 10) : "?"}\nCategories: ${s.categories.slice(0, 12).map((c) => c.name).join(", ")}\nTop places: ${s.topPlaces.slice(0, 12).map((p) => p.name).join(", ")}\nSample events:\n${sample}`,
    reasoning: "none",
  });
  const seen = new Set<string>();
  return output.topics
    .map((t) => ({ ...t, id: t.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "topic", enabled: false }))
    .filter((t) => t.id && !seen.has(t.id) && seen.add(t.id))
    .slice(0, 6);
}

import { generateText } from "ai";
import { MODELS } from "./models";
import type { ContextTopic } from "../types";

export type ResearchNote = { topic: string; text: string; sources: { title: string; url: string }[] };

// One grounded answer from the live web for one context topic, scoped to the
// window the viewer is looking at. The research model searches and cites; the
// briefing and chat models quote it rather than guessing.
export async function research(topic: ContextTopic, question: string): Promise<ResearchNote> {
  const { text, sources } = await generateText({
    model: MODELS.research,
    system: `You are a research assistant. Answer with dated, located facts and figures from reputable sources, preferring primary sources such as ${topic.sources.join(", ") || "official statistics"}. Be concise: under 180 words, plain prose, no headings. Say so if nothing reliable is available.`,
    prompt: question,
  });
  const seen = new Set<string>();
  const cites: ResearchNote["sources"] = [];
  for (const s of sources ?? []) {
    if (s.sourceType !== "url" || seen.has(s.url)) continue;
    seen.add(s.url);
    cites.push({ title: s.title || hostOf(s.url), url: s.url });
  }
  return { topic: topic.label, text: text.trim(), sources: cites };
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// The question for one topic given the window: what the viewer sees, in words
// the research model can search for.
export function researchQuestion(topic: ContextTopic, ctx: { name: string; from: string; to: string; places: string[]; categories: string[] }): string {
  const where = ctx.places.length ? ` in ${ctx.places.slice(0, 5).join(", ")}` : "";
  return `Context for "${ctx.name}" (${ctx.categories.slice(0, 4).join(", ")}) between ${ctx.from} and ${ctx.to}${where}: what happened with ${topic.label.toLowerCase()} in that period and those places? ${topic.why} Give specific figures with dates.`;
}

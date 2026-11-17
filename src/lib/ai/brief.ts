import { z } from "zod";

// The shape of a window briefing: a verdict, findings as cards ranked by
// priority, hypotheses, and follow-up questions. The route streams partial
// objects of this shape; the client renders whatever has arrived.
export const BriefSchema = z.object({
  headline: z.string().describe("One line, under 18 words, the most important thing about this region and window, with a figure in it"),
  findings: z
    .array(
      z.object({
        priority: z.enum(["high", "medium", "low"]).describe("high: changes what a reader would conclude; medium: notable; low: background"),
        kind: z.enum(["trend", "turning-point", "divergence", "outlier", "leader", "comparison", "context"]),
        title: z.string().describe("Under 12 words, a finding with a figure, not a topic"),
        detail: z.string().describe("One or two sentences: the places, dates and numbers that prove it"),
        when: z.string().describe("The dates the finding is about: 'YYYY-MM-DD', 'YYYY-MM', or 'YYYY-MM to YYYY-MM'. Empty string if none"),
        places: z.array(z.string()).describe("Place names exactly as in the statistics, up to four"),
        metric: z.object({
          label: z.string().describe("What the number is, e.g. 'mean yoy change'. Empty if no single number"),
          value: z.string().describe("The number with its unit, e.g. '+9.1%'. Empty if none"),
          change: z.string().describe("Versus the prior window or the comparison, e.g. 'from +3.2%'. Empty if none"),
          direction: z.enum(["up", "down", "flat", "none"]),
        }),
        cites: z.array(z.number()).describe("Citation numbers from the research notes that support it; empty when from the data alone"),
      }),
    )
    .describe("Three to six findings, highest priority first"),
  hypotheses: z.array(z.object({ claim: z.string().describe("One sentence, clearly a hypothesis"), basis: z.string().describe("The timing and geography that support it") })).describe("Zero to two"),
  questions: z.array(z.string()).describe("Three short questions the viewer could ask next"),
});

export type Brief = z.infer<typeof BriefSchema>;
export type BriefFinding = Brief["findings"][number];
export type BriefSource = { n: number; title: string; url: string };

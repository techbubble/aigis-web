import { generateText, Output } from "ai";
import { MODELS } from "../ai/models";
import { ExtractionResultSchema, TableMappingSchema, type ExtractionResult, type TableMapping } from "../types";
import type { Row } from "./parse";

const EXTRACT_SYSTEM = `You are AIGIS, a geospatial intelligence analyst. You read source material and extract every discrete event that has (a) a location and (b) a time, or where either can be confidently inferred from context (document date, dateline, headers).

Rules:
- One event per distinct (what, where, when). Do not merge different places or dates into one event.
- Place: the most specific place mentioned, with disambiguating parents appended (city, region, country).
- Coordinates: provide lat/lng only when you are confident (well known cities, countries, landmarks). Otherwise null.
- Dates: ISO-8601. If only a month or year is known, use the first day (e.g. 2024-03-01) and lower confidence slightly. If the text gives a relative date ("last Tuesday"), resolve it against the document date if provided, else null.
- Times of day in the text are local to the place where the event happens (a diary written in Paris says Paris time). Convert to UTC using that place's time zone, or output the local time with its offset (e.g. 2025-06-22T11:00:00+01:00). Never assume the author's home time zone. If no time of day is given, use midnight local, not a guessed hour.
- Category: a short lowercase label consistent across the document (reuse labels you already used).
- Value/unit: the main quantity if the event has one (cases, deaths, USD, MW, tons, Mw magnitude, attendees).
- sourceQuote: a verbatim excerpt under 200 characters.
- Confidence reflects location AND time certainty.
- Do not invent events. If the text has none, return an empty list and explain in notes.`;

export async function extractFromText(text: string, context: { fileName: string; docDate?: string }): Promise<ExtractionResult> {
  const { output } = await generateText({
    model: MODELS.extract,
    system: EXTRACT_SYSTEM,
    output: Output.object({ schema: ExtractionResultSchema }),
    prompt: `Source file: ${context.fileName}${context.docDate ? `\nDocument date: ${context.docDate}` : ""}\n\n<source>\n${text}\n</source>`,
    temperature: 0.1,
    // Muse Spark reasons at length by default (minutes per chunk); low keeps
    // recall while cutting the wait by about four fifths.
    reasoning: "low",
  });
  return output;
}

export async function extractFromImage(data: Uint8Array, mediaType: string, context: { fileName: string }): Promise<ExtractionResult> {
  const { output } = await generateText({
    model: MODELS.extract,
    system: EXTRACT_SYSTEM,
    output: Output.object({ schema: ExtractionResultSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Source image: ${context.fileName}. This may be a photo, a scanned document, a chart, a map, a screenshot or a table. Read all text and visual cues (signage, captions, map labels, axis labels, legends) and extract located, dated events.`,
          },
          { type: "file", mediaType, data },
        ],
      },
    ],
    temperature: 0.1,
    reasoning: "low",
  });
  return output;
}

export async function inferTableMapping(fileName: string, headers: string[], sample: Row[]): Promise<TableMapping> {
  const sampleText = sample
    .slice(0, 8)
    .map((r, i) => `${i + 1}. ${headers.map((h) => `${h}=${JSON.stringify(r[h])}`).join(" | ")}`)
    .join("\n");
  const { output } = await generateText({
    model: MODELS.extract,
    output: Output.object({ schema: TableMappingSchema }),
    system:
      "You map spreadsheet columns onto a geospatial event schema. Use exact header strings from the provided list. Prefer explicit latitude/longitude columns over place names. For placeColumns list the most specific column first. If multiple date columns exist pick the one representing when the thing happened. Return null for anything not present.",
    prompt: `File: ${fileName}\nHeaders: ${JSON.stringify(headers)}\nSample rows:\n${sampleText}`,
    temperature: 0,
    reasoning: "none",
  });
  return output;
}

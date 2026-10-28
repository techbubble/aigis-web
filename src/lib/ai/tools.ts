import { z } from "zod";

// Shared between the chat route (server) and the explorer (client), so the
// client-side tool is typed the same way on both ends.
export const FocusMapInput = z.object({
  timeRange: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Two ISO dates [from, to] to restrict the timeline to; omit for the full range"),
  categories: z.array(z.string()).nullable().optional().describe("Only show these categories; omit for all"),
  placeContains: z.string().nullable().optional().describe("Only show events whose place name contains this text (case-insensitive)"),
  eventIds: z.array(z.string()).nullable().optional().describe("Highlight these specific event ids"),
  bbox: z
    .array(z.number())
    .nullable()
    .optional()
    .describe("[minLng, minLat, maxLng, maxLat] to fly the camera to; omit to fit the visible events"),
  play: z.boolean().nullable().optional().describe("True to start the time animation from the beginning of the range"),
  caption: z.string().nullable().optional().describe("One sentence shown on the map describing what the viewer is looking at"),
});
export type FocusMapInputT = z.infer<typeof FocusMapInput>;

// All model IDs are Vercel AI Gateway strings (provider/model), chosen for
// price. Gemini 2.5 Flash-Lite reads, captions and designs at $0.10 in /
// $0.40 out per million tokens; Claude Haiku 5.5 runs the tool-calling
// agent at $0.10 / $0.50 with the fastest, cleanest tool use of the cheap
// tier; FLUX.3 Klein paints surface textures at under a cent an image.
// Override per environment without code changes.
export const MODELS = {
  extract: process.env.AIGIS_EXTRACT_MODEL ?? "google/gemini-2.5-flash-lite",
  chat: process.env.AIGIS_CHAT_MODEL ?? "anthropic/claude-haiku-5.5",
  deep: process.env.AIGIS_DEEP_MODEL ?? "google/gemini-2.5-flash-lite",
  image: process.env.AIGIS_IMAGE_MODEL ?? "bfl/flux-3-image-klein",
} as const;

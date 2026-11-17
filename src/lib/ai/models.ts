// All model IDs are Vercel AI Gateway strings (provider/model), chosen for
// price. Gemini 2.5 Flash-Lite reads, captions and designs at $0.10 in /
// $0.40 out per million tokens; Claude Haiku 5.5 runs the tool-calling
// agent at $0.10 / $0.50 with the fastest, cleanest tool use of the cheap
// tier;
// Perplexity Sonar answers from the live web with citations at $0.25 /
// $2.50 plus a fraction of a cent per search, for the outside context the
// user turns on. Override per environment without code changes.
export const MODELS = {
  extract: process.env.AIGIS_EXTRACT_MODEL ?? "google/gemini-2.5-flash-lite",
  chat: process.env.AIGIS_CHAT_MODEL ?? "anthropic/claude-haiku-5.5",
  deep: process.env.AIGIS_DEEP_MODEL ?? "google/gemini-2.5-flash-lite",
  research: process.env.AIGIS_RESEARCH_MODEL ?? "perplexity/sonar",
} as const;

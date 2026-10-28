// All model IDs are Vercel AI Gateway strings (provider/model).
// Override per environment without code changes.
export const MODELS = {
  extract: process.env.AIGIS_EXTRACT_MODEL ?? "meta/muse-spark-1.3",
  chat: process.env.AIGIS_CHAT_MODEL ?? "meta/muse-spark-1.3",
  deep: process.env.AIGIS_DEEP_MODEL ?? "meta/muse-wonder-1.0",
  image: process.env.AIGIS_IMAGE_MODEL ?? "meta/muse-image-1.0",
} as const;

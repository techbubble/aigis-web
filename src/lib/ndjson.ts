import type { IngestProgress } from "./types";

// Streams progress events as newline-delimited JSON while the pipeline runs.
export function ndjsonStream(run: (emit: (p: IngestProgress) => void) => Promise<unknown>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (p: IngestProgress) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(p) + "\n"));
        } catch {
          /* closed */
        }
      };
      run(emit)
        .catch((err: Error) => emit({ type: "error", message: err.message ?? String(err) }))
        .finally(() => {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import type { FocusMapInputT } from "@/lib/ai/tools";
import type { ContextTopic, Dataset } from "@/lib/types";
import { Briefing } from "./Briefing";
import { Markdown } from "./Markdown";
import type { Filter } from "./explorer-state";

export type ChatHandle = { ask: (q: string) => void };

export function ChatPanel({
  dataset,
  window: win,
  viewBounds,
  filter,
  contexts,
  onContexts,
  suggestions,
  onFocus,
  handleRef,
  inputHeight = 0,
}: {
  dataset: Dataset;
  window: [number, number];
  viewBounds: [number, number, number, number] | null;
  filter: Filter;
  contexts: ContextTopic[];
  onContexts: (ids: string[]) => void;
  suggestions: string[];
  onFocus: (f: FocusMapInputT) => void;
  handleRef: React.MutableRefObject<ChatHandle | null>;
  // When set, the input block is this tall (matches the timeline bar beside it).
  inputHeight?: number;
}) {
  const datasetId = dataset.id;
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);
  // Every message carries what the user is looking at and which outside
  // sources are on, read at send time.
  const viewRef = useRef({ win, contexts, viewBounds });
  useEffect(() => {
    viewRef.current = { win, contexts, viewBounds };
  }, [win, contexts, viewBounds]);

  const { messages, sendMessage, status, error, addToolOutput, stop } = useChat({
    // The request body is built at send time, not during render; the ref holds the latest view.
    // eslint-disable-next-line react-hooks/refs
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, id }) => ({
        body: { id, messages, datasetId, window: viewRef.current.win, bbox: viewRef.current.viewBounds, contexts: viewRef.current.contexts.filter((t) => t.enabled).map((t) => t.id) },
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      if (toolCall.toolName === "focusMap") {
        const input = toolCall.input as FocusMapInputT;
        onFocusRef.current(input);
        addToolOutput({ tool: "focusMap" as never, toolCallId: toolCall.toolCallId, output: "Map updated." as never });
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    handleRef.current = {
      ask: (q: string) => {
        void sendMessage({ text: q });
      },
    };
  }, [handleRef, sendMessage]);

  useEffect(() => {
    if (!messages.length) return;
    const el = bottomRef.current;
    const list = el?.parentElement;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const submit = () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    void sendMessage({ text: q });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-thin flex-1 space-y-4 overflow-auto px-4 py-4">
        <Briefing dataset={dataset} window={win} viewBounds={viewBounds} filter={filter} contexts={contexts} onContexts={onContexts} />
        {messages.length === 0 && (
          <div className="text-sm text-mist">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-dim">Follow up</div>
            <div className="mt-2 space-y-1.5">
              {(suggestions.length ? suggestions : DEFAULTS).map((s) => (
                <button key={s} onClick={() => void sendMessage({ text: s })} className="block w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-left text-xs text-fog hover:bg-ink-3">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {busy && messages[messages.length - 1]?.role === "user" && <div className="text-xs text-dim">Thinking</div>}
        {error && <div className="rounded border border-red-900 bg-red-950/40 p-2 text-xs text-red-300">{error.message}</div>}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex shrink-0 flex-col border-t border-line p-3"
        style={inputHeight ? { height: inputHeight } : undefined}
      >
        <div className="flex min-h-0 flex-1 items-end gap-2 rounded-lg border border-line bg-ink-2 p-1.5 focus-within:border-glow">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask a follow-up"
            className={`flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-dim ${inputHeight ? "h-full" : "max-h-32"}`}
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="rounded-md border border-line px-3 py-1.5 text-xs text-mist hover:text-fog">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="rounded-md bg-glow px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40">
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const DEFAULTS = ["What stands out in this data?", "Replay the whole timeline", "Where are the hotspots?", "Which events are anomalies?"];

function Message({ m }: { m: UIMessage }) {
  if (m.role === "user") {
    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-ink-3 px-3 py-2 text-sm">{text}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm">
      {m.parts.map((p, i) => {
        if (p.type === "text") return <Markdown key={i} text={p.text} />;
        if (p.type.startsWith("tool-")) {
          const tp = p as unknown as { type: string; state: string; input?: Record<string, unknown>; output?: unknown };
          const name = tp.type.slice(5);
          if (name === "focusMap") {
            const cap = (tp.input?.caption as string) ?? "";
            return (
              <div key={i} className="inline-flex items-center gap-1.5 rounded-full border border-glow/40 bg-glow/10 px-2.5 py-1 text-xs text-glow">
                <Dot /> Map: {cap || "updated"}
              </div>
            );
          }
          const out = tp.output as { total?: number; sources?: { title: string; url: string }[] } | unknown[] | undefined;
          const n = Array.isArray(out) ? out.length : out && typeof out === "object" && "total" in out ? (out as { total?: number }).total : undefined;
          const cites = !Array.isArray(out) && out && typeof out === "object" && Array.isArray(out.sources) ? out.sources.slice(0, 4) : [];
          if (name === "research" && cites.length)
            return (
              <div key={i} className="text-xs text-mist">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1">Researched {(tp.input?.topic as string) ?? "the web"}</span>
                <span className="ml-2">
                  {cites.map((c, k) => (
                    <a key={k} href={c.url} target="_blank" rel="noreferrer" className="mr-2 text-glow underline decoration-glow/40">
                      {c.title.slice(0, 40)}
                    </a>
                  ))}
                </span>
              </div>
            );
          return (
            <div key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-mist">
              {tp.state === "output-available" ? "" : "Running "}
              {name === "queryEvents" ? `Searched events${n != null ? ": " + n + " matched" : ""}` : name === "getInsights" ? `Checked pattern engine${n != null ? ": " + n + " findings" : ""}` : name === "getEvent" ? "Read event record" : name === "research" ? `Researched ${(tp.input?.topic as string) ?? "the web"}` : name}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-glow" />;
}

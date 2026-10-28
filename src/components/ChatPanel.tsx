"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import type { FocusMapInputT } from "@/lib/ai/tools";
import type { Insight } from "@/lib/types";
import { FindingsList } from "./InsightsPanel";

export type ChatHandle = { ask: (q: string) => void };

export function ChatPanel({
  datasetId,
  suggestions,
  insights,
  onPickInsight,
  onFocus,
  handleRef,
  inputHeight = 0,
}: {
  datasetId: string;
  suggestions: string[];
  insights: Insight[];
  onPickInsight: (i: Insight) => void;
  onFocus: (f: FocusMapInputT) => void;
  handleRef: React.MutableRefObject<ChatHandle | null>;
  // When set, the input block is this tall (matches the timeline bar beside it).
  inputHeight?: number;
}) {
  const [input, setInput] = useState("");
  const [findingsOpen, setFindingsOpen] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  const { messages, sendMessage, status, error, addToolOutput, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", body: { datasetId } }),
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
        {/* Findings: open until the conversation starts, then a header to reopen. */}
        {(() => {
          const open = findingsOpen ?? messages.length === 0;
          return (
            <div>
              <button onClick={() => setFindingsOpen(!open)} className="flex w-full items-center justify-between text-left">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-dim">Findings{insights.length ? ` (${insights.length})` : ""}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-dim transition ${open ? "rotate-180" : ""}`}>
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {open && (
                <div className="mt-2">
                  {insights.length > 0 && <p className="mb-2 text-xs text-dim">Computed from the data, not by the model. Click one to see it on the map.</p>}
                  <FindingsList insights={insights} onPick={onPickInsight} onAsk={(q) => void sendMessage({ text: q })} />
                </div>
              )}
            </div>
          );
        })()}
        {messages.length === 0 && (
          <div className="text-sm text-mist">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-dim">Ask</div>
            <p className="mt-2 text-xs leading-relaxed">Ask about the map. I can filter it, replay a period, zoom to a place, compare categories and explain the findings.</p>
            <div className="mt-3 space-y-1.5">
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
            placeholder="Ask AIGIS"
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
          const out = tp.output as { total?: number } | unknown[] | undefined;
          const n = Array.isArray(out) ? out.length : out && typeof out === "object" && "total" in out ? (out as { total?: number }).total : undefined;
          return (
            <div key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-mist">
              {tp.state === "output-available" ? "" : "Running "}
              {name === "queryEvents" ? `Searched events${n != null ? ": " + n + " matched" : ""}` : name === "getInsights" ? `Checked pattern engine${n != null ? ": " + n + " findings" : ""}` : name === "getEvent" ? "Read event record" : name}
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

// Small markdown subset: paragraphs, bullet lists, bold, inline code.
function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-chat leading-relaxed text-fog/90">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const isList = lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const items = lines.map((l) => l.replace(/^\s*([-*]|\d+\.)\s+/, ""));
          return ordered ? (
            <ol key={i}>
              {items.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </ol>
          ) : (
            <ul key={i}>
              {items.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </ul>
          );
        }
        if (/^#{1,4}\s/.test(b)) return <p key={i} className="font-semibold">{inline(b.replace(/^#{1,4}\s/, ""))}</p>;
        return <p key={i}>{inline(b.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0,
    m: RegExpExecArray | null,
    k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}


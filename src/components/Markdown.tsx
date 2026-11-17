"use client";

// Small markdown subset shared by the chat and the briefing: paragraphs,
// bullet and numbered lists, headings, bold, inline code and links.
export function Markdown({ text, onAsk }: { text: string; onAsk?: (q: string) => void }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-chat leading-relaxed text-fog/90">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        // A heading followed by list items in the same block.
        const head = /^(#{1,4}\s|\*\*[^*]+\*\*:?\s*$)/.test(lines[0]) && lines.length > 1 && lines.slice(1).every((l) => /^\s*([-*]|\d+\.)\s+/.test(l)) ? lines[0] : null;
        const items = head ? lines.slice(1) : lines;
        const isList = items.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d+\./.test(items[0]);
          const its = items.map((l) => l.replace(/^\s*([-*]|\d+\.)\s+/, ""));
          const askable = onAsk && head && /ask next/i.test(head);
          const list = askable ? (
            <div className="mt-1 space-y-1">
              {its.map((it, j) => (
                <button key={j} onClick={() => onAsk(it.replace(/\*\*/g, ""))} className="block w-full rounded-md border border-line bg-ink-2 px-3 py-1.5 text-left text-xs text-fog hover:bg-ink-3">
                  {inline(it)}
                </button>
              ))}
            </div>
          ) : ordered ? (
            <ol>
              {its.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </ol>
          ) : (
            <ul>
              {its.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </ul>
          );
          return (
            <div key={i}>
              {head && <p className="font-semibold">{inline(head.replace(/^#{1,4}\s/, "").replace(/:\s*$/, ""))}</p>}
              {list}
            </div>
          );
        }
        if (/^#{1,4}\s/.test(b)) return <p key={i} className="font-semibold">{inline(b.replace(/^#{1,4}\s/, ""))}</p>;
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}

export function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0,
    m: RegExpExecArray | null,
    k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else {
      const label = tok.slice(1, tok.indexOf("]("));
      out.push(
        <a key={k++} href={m[2]} target="_blank" rel="noreferrer" className="text-glow underline decoration-glow/40 hover:decoration-glow">
          {label}
        </a>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

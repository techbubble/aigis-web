"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dataset, IngestProgress, SourceFile } from "@/lib/types";
import { preparePhotos } from "@/lib/client-photos";

type Job = { title: string; log: string[]; pct: number; error?: string };
export type LibraryItem = { id: string; name: string; count: number; savedAt?: string };

const ACCEPT = ".pdf,.csv,.tsv,.xlsx,.xls,.txt,.md,.json,.geojson,.html,.png,.jpg,.jpeg,.webp";

// Studio: the documents behind a story. Drop files to build a new one or to
// add to this one; remove a document and its events go with it.
export function SourcesPanel({
  view,
  dataset,
  isNew,
  editable,
  themeId,
  library,
  onChanged,
}: {
  // "general": title and sources. "stories": the user's story list.
  view: "general" | "stories";
  dataset: Dataset;
  isNew: boolean;
  editable: boolean;
  themeId: string;
  library: LibraryItem[];
  onChanged: (ds: Dataset) => void;
}) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [name, setName] = useState(dataset.name === "Untitled story" && isNew ? "" : dataset.name);
  const [subtitle, setSubtitle] = useState(dataset.subtitle ?? "");
  const [savedMeta, setSavedMeta] = useState<"idle" | "saving" | "saved">("idle");
  // Title and subtitle save themselves when you leave the field.
  const saveMeta = async () => {
    if (isNew) return;
    const nextName = name.trim() || dataset.name;
    const nextSub = subtitle.trim();
    if (nextName === dataset.name && nextSub === (dataset.subtitle ?? "")) return;
    setSavedMeta("saving");
    const res = await fetch(`/api/datasets/${dataset.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: nextName, subtitle: nextSub }) });
    if (res.ok) {
      onChanged({ ...dataset, name: nextName, subtitle: nextSub || undefined });
      setSavedMeta("saved");
      setTimeout(() => setSavedMeta("idle"), 1500);
    } else setSavedMeta("idle");
  };
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [lib, setLib] = useState(library);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = !!job && !job.error && job.pct < 100;

  const perSource = new Map<string, number>();
  for (const e of dataset.events) perSource.set(e.sourceFile, (perSource.get(e.sourceFile) ?? 0) + 1);

  const reload = async () => {
    const res = await fetch(`/api/datasets/${dataset.id}`, { cache: "no-store" });
    if (res.ok) onChanged((await res.json()) as Dataset);
  };

  const consume = async (res: Response, title: string) => {
    if (!res.ok || !res.body) {
      const msg = await res.text().catch(() => res.statusText);
      setJob({ title, log: [], pct: 0, error: msg || `HTTP ${res.status}` });
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const p = JSON.parse(line) as IngestProgress;
        if (p.type === "status") setJob((j) => ({ ...(j ?? { title, log: [], pct: 0 }), log: [...(j?.log ?? []).slice(-200), p.message], pct: p.pct ?? j?.pct ?? 0 }));
        else if (p.type === "error") setJob((j) => ({ ...(j ?? { title, log: [], pct: 0 }), error: p.message }));
        else if (p.type === "done") {
          setJob((j) => ({ ...(j ?? { title, log: [], pct: 0 }), pct: 100, log: [...(j?.log ?? []), `Done: ${p.summary.count} events`] }));
          setFiles([]);
          if (isNew || p.datasetId !== dataset.id) router.push(`/studio/${p.datasetId}`);
          else {
            await reload();
            setTimeout(() => setJob(null), 1500);
          }
        }
      }
    }
  };

  const upload = async () => {
    if (!files.length || busy) return;
    const title = isNew ? name || files[0].name.replace(/\.[^.]+$/, "") : `Adding ${files.length} file${files.length === 1 ? "" : "s"}`;
    setJob({ title, log: ["Reading photo metadata and preparing files"], pct: 1 });
    const fd = new FormData();
    const { files: prepared, meta } = await preparePhotos(files);
    for (const f of prepared) fd.append("files", f);
    if (Object.keys(meta).length) fd.set("meta", JSON.stringify(meta));
    setJob({ title, log: ["Uploading"], pct: 1 });
    if (isNew) {
      fd.set("name", title);
      if (subtitle.trim()) fd.set("subtitle", subtitle.trim());
      fd.set("theme", themeId);
      await consume(await fetch("/api/ingest", { method: "POST", body: fd }), title);
    } else {
      await consume(await fetch(`/api/datasets/${dataset.id}/sources`, { method: "POST", body: fd }), title);
    }
  };


  const remove = async (src: SourceFile) => {
    setRemoving(src.name);
    setConfirm(null);
    try {
      const res = await fetch(`/api/datasets/${dataset.id}/sources?name=${encodeURIComponent(src.name)}`, { method: "DELETE" });
      if (res.ok) await reload();
    } finally {
      setRemoving(null);
    }
  };

  const others = lib;
  const persistOrder = (list: LibraryItem[]) => {
    setLib(list);
    void fetch("/api/datasets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: list.map((d) => d.id) }) });
  };
  const move = (id: string, dir: -1 | 1) => {
    const list = [...others];
    const i = list.findIndex((d) => d.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    persistOrder(list);
  };
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const list = [...others];
    const from = list.findIndex((d) => d.id === dragId);
    const to = list.findIndex((d) => d.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    persistOrder(list);
    setDragId(null);
  };
  const destroy = async (id: string) => {
    setDeleting(id);
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      if (id === dataset.id) router.push("/studio");
      else setLib((l) => l.filter((d) => d.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const addFiles = (list: FileList | File[]) => setFiles((prev) => [...prev, ...Array.from(list).filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))]);

  return (
    <div className="scroll-thin flex h-full flex-col gap-5 overflow-auto px-4 pb-4 pt-2 text-sm">
      {view === "general" && (
        <>
      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-dim">{isNew ? "New story" : "General"}</div>
          {savedMeta !== "idle" && <span className="text-[10px] text-dim">{savedMeta === "saving" ? "Saving" : "Saved"}</span>}
        </div>
        <div className="mt-2 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveMeta}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Title"
            aria-label="Title"
            className="w-full rounded-lg border border-line bg-ink-2/60 px-3 py-2 text-sm font-medium outline-none focus:border-glow"
          />
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            onBlur={saveMeta}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Subtitle"
            aria-label="Subtitle"
            className="w-full rounded-lg border border-line bg-ink-2/60 px-3 py-2 text-sm outline-none focus:border-glow"
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-dim">Sources</div>
        <p className="mt-1 text-xs leading-relaxed text-mist">
          {isNew ? "Drop the documents, spreadsheets or photos the map should be made from. Where and when come from the files; AIGIS writes the story." : "The documents this story is built from. Add more to grow it, remove one and its events leave the map."}
        </p>
      </div>

      {/* Drop zone */}
      {editable && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border border-dashed bg-white px-4 py-6 text-center transition ${drag ? "border-glow" : "border-line hover:border-ink-3"}`}
        >
          <input ref={inputRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-ink-3/40 text-ink">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 14V4M5 9l5-5 5 5M3 16h14" />
            </svg>
          </div>
          <div className="mt-2 text-sm font-medium text-ink">{isNew ? "Drop files or click to choose" : "Drop files to add, or click"}</div>
          <div className="mt-0.5 text-[11px] text-ink-3">Photos, PDF, CSV, XLSX, text, Markdown, JSON</div>
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-xl border border-line bg-ink-2/60 p-3">
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-dim">
                  {(f.size / 1024).toFixed(0)} KB
                  <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="rounded px-1 hover:bg-ink-3 hover:text-fog" aria-label={`Remove ${f.name}`}>
                    &times;
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button onClick={upload} disabled={busy} className="flex-1 rounded-lg bg-glow px-3 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-60">
              {isNew ? "Build the story" : `Add to this story`}
            </button>
            <button onClick={() => setFiles([])} disabled={busy} className="rounded-lg border border-line px-3 py-2 text-sm text-mist hover:text-fog">
              Clear
            </button>
          </div>
        </div>
      )}

      {job && (
        <div className="rounded-xl border border-line bg-ink-2/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-fog">{job.error ? "Something went wrong" : job.title}</span>
            {(job.error || job.pct >= 100) && (
              <button onClick={() => setJob(null)} className="text-dim hover:text-fog">
                Close
              </button>
            )}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-ink-3">
            <div className="h-full bg-gradient-to-r from-glow to-glow-2 transition-all duration-500" style={{ width: `${Math.max(2, job.pct)}%` }} />
          </div>
          <ul className="mt-2 max-h-32 overflow-auto font-mono text-[11px] text-mist">
            {job.log.slice(-8).map((l, i) => (
              <li key={i} className="truncate py-0.5">
                {l}
              </li>
            ))}
            {job.error && <li className="py-0.5 text-red-400">{job.error}</li>}
          </ul>
        </div>
      )}

      {/* Existing documents */}
      {dataset.sources.length > 0 && (
        <ul className="space-y-1.5">
          {dataset.sources.map((src) => {
            const n = perSource.get(src.name) ?? 0;
            const asking = confirm === src.name;
            return (
              <li key={src.name} className="rounded-xl border border-line bg-ink-2/60 px-3 py-2">
                <div className="flex items-center gap-3">
                  <KindIcon kind={src.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-fog">{src.name}</div>
                    <div className="text-[11px] text-dim">
                      {kindLabel(src)} · {n} event{n === 1 ? "" : "s"}
                    </div>
                  </div>
                  {editable && !asking && (
                    <button
                      onClick={() => setConfirm(src.name)}
                      disabled={removing === src.name || busy}
                      className="rounded px-2 py-1 text-[11px] text-dim hover:bg-ink-3 hover:text-fog disabled:opacity-50"
                    >
                      {removing === src.name ? "Removing" : "Remove"}
                    </button>
                  )}
                </div>
                {asking && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-ink px-2.5 py-2 text-[11px]">
                    <span className="text-mist">
                      Remove this document and its {n} event{n === 1 ? "" : "s"}?
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button onClick={() => remove(src)} className="rounded bg-red-500/90 px-2 py-1 font-medium text-white hover:bg-red-500">
                        Remove
                      </button>
                      <button onClick={() => setConfirm(null)} className="rounded border border-line px-2 py-1 text-mist hover:text-fog">
                        Keep
                      </button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

        </>
      )}

      {view === "stories" && !isNew && (
        <Link href="/studio" className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2.5 text-sm text-glow hover:border-glow">
          <span className="text-base leading-none">+</span> New story
        </Link>
      )}
      {view === "stories" && others.length === 0 && <div className="text-xs text-dim">No stories yet. Upload sources in General to create one.</div>}
      {view === "stories" && others.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-dim">Your stories</div>
            <div className="text-[10px] text-dim">drag to reorder</div>
          </div>
          <ul className="mt-2 space-y-1">
            {others.map((d) => {
              const asking = confirmDelete === d.id;
              const current = d.id === dataset.id;
              return (
                <li
                  key={d.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(d.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOn(d.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={`group rounded-lg px-1.5 py-1.5 transition hover:bg-ink-2/60 ${dragId === d.id ? "opacity-40" : ""} ${current ? "bg-ink-2/60" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="flex shrink-0 cursor-grab flex-col text-dim active:cursor-grabbing" title="Drag to reorder">
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                        {[2, 7, 12].map((y) => (
                          <g key={y}>
                            <circle cx="4" cy={y} r="1.1" />
                            <circle cx="8" cy={y} r="1.1" />
                          </g>
                        ))}
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm ${current ? "font-medium text-fog" : "text-fog"}`}>
                        {d.name}
                        {current && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-glow">open</span>}
                      </div>
                      <div className="text-[11px] text-dim">
                        {d.count} events{d.savedAt ? ` · saved ${new Date(d.savedAt).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <span className="mr-1 flex flex-col opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => move(d.id, -1)} className="rounded px-1 leading-none text-dim hover:text-fog" aria-label={`Move ${d.name} up`}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 6l4-4 4 4" />
                          </svg>
                        </button>
                        <button onClick={() => move(d.id, 1)} className="rounded px-1 leading-none text-dim hover:text-fog" aria-label={`Move ${d.name} down`}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 2l4 4 4-4" />
                          </svg>
                        </button>
                      </span>
                      <Link href={`/studio/${d.id}`} className="rounded-md p-1.5 text-mist hover:bg-ink-3 hover:text-fog" aria-label={`Edit ${d.name}`} title="Edit in Studio">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11.5 2.5l2 2L5 13H3v-2z" />
                          <path d="M10 4l2 2" />
                        </svg>
                      </Link>
                      <Link href={`/view/${d.id}`} className="rounded-md p-1.5 text-mist hover:bg-ink-3 hover:text-fog" aria-label={`View ${d.name}`} title="Open the view">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
                          <circle cx="8" cy="8" r="2" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(asking ? null : d.id)}
                        disabled={deleting === d.id}
                        className="rounded-md p-1.5 text-mist hover:bg-ink-3 hover:text-red-400 disabled:opacity-50"
                        aria-label={`Delete ${d.name}`}
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 4h10M6 4V2.5h4V4M5 4l.7 9h4.6L11 4" />
                        </svg>
                      </button>
                    </span>
                  </div>
                  {asking && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-ink px-2.5 py-2 text-[11px]">
                      <span className="text-mist">Delete “{d.name}” for good? The view link stops working.</span>
                      <span className="flex shrink-0 gap-1">
                        <button onClick={() => destroy(d.id)} className="rounded bg-red-500/90 px-2 py-1 font-medium text-white hover:bg-red-500">
                          Delete
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded border border-line px-2 py-1 text-mist hover:text-fog">
                          Keep
                        </button>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

    </div>
  );
}

function kindLabel(s: SourceFile) {
  if (s.kind === "table") return `Table · ${s.rows ?? 0} rows`;
  if (s.kind === "photo") return "Photo";
  if (s.kind === "image") return "Image";
  if (s.kind === "pdf") return `PDF · ${s.chunks ?? 1} chunk${(s.chunks ?? 1) === 1 ? "" : "s"}`;
  if (s.kind === "json") return "JSON";
  return `Text · ${s.chunks ?? 1} chunk${(s.chunks ?? 1) === 1 ? "" : "s"}`;
}

function KindIcon({ kind }: { kind: SourceFile["kind"] }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4 } as const;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-mist">
      {kind === "table" ? (
        <svg {...common}>
          <rect x="2" y="3" width="12" height="10" rx="1" />
          <path d="M2 7h12M6 3v10" />
        </svg>
      ) : kind === "photo" || kind === "image" ? (
        <svg {...common}>
          <rect x="2" y="3" width="12" height="10" rx="1" />
          <path d="M2 11l4-4 3 3 2-2 3 3" />
          <circle cx="11" cy="6" r="1" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M4 2h5l3 3v9H4z" />
          <path d="M9 2v3h3M6 8h4M6 11h4" />
        </svg>
      )}
    </span>
  );
}

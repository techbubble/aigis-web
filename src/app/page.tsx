import Link from "next/link";
import { SAMPLES } from "@/lib/samples";
import { Logo } from "@/components/Logo";
import { LandingNav } from "@/components/LandingNav";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  return (
    <main className="flex-1 overflow-x-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 grid-bg" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 hero-fade-b" />

        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <span className="text-2xl font-semibold tracking-[0.2em] md:text-3xl">AIGIS</span>
          </div>
          <LandingNav user={user && { email: user.email, name: user.name }} />
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-8 md:pt-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              Maps that <span className="font-serif-display font-normal italic text-glow">think.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-xl leading-relaxed text-mist md:text-2xl">
              Geographic intelligence from the documents you already have. Drop in research, reports and spreadsheets;
              AIGIS puts every located, dated fact on a timeline map, analyzes whatever window you select, pulls in the
              outside context you approve, and tells you what it means.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a href="#demos" className="inline-flex h-14 w-56 items-center justify-center rounded-full border-2 border-glow bg-glow text-lg font-semibold text-ink shadow-[0_0_48px_rgba(56,189,248,0.45)] transition hover:opacity-90">
                View Demo
              </a>
              <Link href="/studio" className="inline-flex h-14 w-56 items-center justify-center rounded-full border-2 border-fog/70 text-lg font-semibold text-fog transition hover:border-fog hover:bg-fog/10">
                New story
              </Link>
            </div>
          </div>
          {/* The pipeline, animated: documents in, extraction in the middle, events landing on the globe. */}
          <div className="relative -mx-6 mt-6 pb-10 md:mx-0 md:mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/workflow-hero.svg" alt="Documents flow through extraction into events that land on an animated globe" className="block w-full" width={1200} height={470} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-7xl px-6 pb-8 pt-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Step n="01" color="#38bdf8" title="Ingest" body="Any file. Tables are column-mapped once by the model, then converted row by row. Prose, scans and photos are read for every event with a place and a time." />
          <Step n="02" color="#a78bfa" title="Discover" body="Every event gets coordinates, a time, a value and a confidence score. Then AIGIS reads the whole set for what matters: turning points, divergences, leaders and laggards, and connections between what the documents claimed and what the numbers did." />
          <Step n="03" color="#34d399" title="Brief the window" body="Move the window on the timeline and the briefing follows: what is inside it, how it compares with the span before, and what it may mean. Numbers are computed; the model only writes over them." />
          <Step n="04" color="#fbbf24" title="Go deeper" body="At ingest AIGIS proposes the outside sources that would explain the data: an industry index, a government series, a news beat. Switch them on and briefings and chat research them, with citations." />
        </div>
      </section>

      {/* Demos: public views of saved stories */}
      <section id="demos" className="mx-auto max-w-7xl scroll-mt-10 px-6 pb-24 pt-20">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-dim">Demo</h2>
          <p className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Public research, <span className="font-serif-display font-normal italic text-mist">read as intelligence.</span>
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {SAMPLES.map((s) => (
            <div
              key={s.id}
              className="relative grid overflow-hidden rounded-3xl border md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${s.accent} 26%, var(--ink-3)) 0%, color-mix(in srgb, ${s.accent} 6%, var(--ink-2)) 65%)`,
                borderColor: `color-mix(in srgb, ${s.accent} 45%, transparent)`,
                boxShadow: `0 30px 80px -40px ${s.accent}`,
              }}
            >
              <div className="p-8 md:p-12">
                <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: s.accent }}>
                  {s.tagline}
                </div>
                <h3 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-fog md:text-5xl">{s.title}</h3>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mist md:text-xl">{s.blurb}</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href={`/view/sample-${s.id}`} className="inline-flex h-14 items-center justify-center rounded-full bg-glow px-10 text-lg font-semibold text-ink shadow-[0_0_48px_rgba(56,189,248,0.45)] transition hover:opacity-90">
                    View Demo
                  </Link>
                  <span className="text-sm text-dim">No sign-in needed</span>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  {s.questions.map((q) => (
                    <span key={q} className="rounded-full border border-line px-3 py-1 text-xs text-mist">
                      {q}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 bg-ink/40 p-8 md:border-l md:border-t-0 md:p-10">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-dim">Built from public documents</div>
                <ul className="mt-5 space-y-4">
                  {s.sources.map((src) => (
                    <li key={src.label} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line font-mono text-[10px] font-semibold uppercase text-mist">{src.kind === "table" ? "csv" : "pdf"}</span>
                      <span className="text-base leading-snug text-fog">{src.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm leading-relaxed text-dim">Every number on the map traces back to one of these files. Outside context, when you switch it on, is researched live and cited.</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between rounded-2xl border px-6 py-5" style={{ background: "linear-gradient(135deg, color-mix(in srgb, #f1f6f6 14%, var(--ink-3)) 0%, var(--ink-2) 70%)", borderColor: "rgba(255,255,255,0.18)" }}>
          <div>
            <div className="text-xl font-semibold">Ready to use your own documents?</div>
            <div className="text-base text-mist">Studio turns your files into an intelligent map you can save, share and question.</div>
          </div>
          <Link href="/studio" className="rounded-full bg-fog px-7 py-3.5 text-base font-semibold text-ink hover:opacity-85">
            New story
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-dim">
          <div className="flex items-center gap-2">
            <Logo size={18} /> AIGIS · geographic intelligence
          </div>
          <div>Models via Vercel AI Gateway · OpenFreeMap tiles · Photon and Nominatim geocoding (OpenStreetMap)</div>
        </div>
      </footer>
    </main>
  );
}

function Step({ n, color, title, body }: { n: string; color: string; title: string; body: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6 pl-7"
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 34%, var(--ink-3)) 0%, color-mix(in srgb, ${color} 8%, var(--ink-2)) 70%)`,
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        boxShadow: `0 24px 60px -32px ${color}`,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <div className="font-mono text-sm" style={{ color }}>
        {n}
      </div>
      <div className="mt-2 text-xl font-semibold">{title}</div>
      <p className="mt-2 text-base leading-relaxed text-mist">{body}</p>
    </div>
  );
}

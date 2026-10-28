import Link from "next/link";
import { SAMPLES } from "@/lib/samples";
import { HeroGlobe } from "@/components/HeroGlobe";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <main className="flex-1 overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-[100svh]">
        <div className="absolute inset-0 grid-bg" />
        {/* The globe owns the right half and bleeds off the edge. */}
        <div className="absolute inset-y-0 right-[-22%] w-full opacity-60 md:right-[-12%] md:w-[74%] md:opacity-100">
          <div className="absolute inset-0">
            <HeroGlobe />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--ink)_0%,var(--ink-55)_22%,var(--ink-0)_48%)]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 hero-fade-b" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-base font-semibold tracking-[0.18em]">AIGIS</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-mist">
            <a href="#demos" className="hover:text-fog">
              Demos
            </a>
            <Link href="/studio" className="hover:text-fog">
              Studio
            </Link>
            <span className="hidden rounded-full border border-line px-3 py-1 text-xs text-dim md:inline">Muse Spark · Vercel AI Gateway</span>
            <ThemeToggle />
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl px-6 pb-24 pt-10 md:pt-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-glow/30 bg-glow/10 px-3 py-1 text-xs text-glow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow" />
              Meta Global AI Developer Hackathon 2026
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              Every document is a map <span className="font-serif-display font-normal italic text-glow">waiting to move.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-mist">
              Drop in reports, spreadsheets, photos or news. Autonomous agents pull out every event with a place and a time, hunt for
              patterns and anomalies, and hand you an animated map you can interrogate in plain language.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#demos" className="rounded-full bg-fog px-6 py-3 text-sm font-semibold text-ink transition hover:opacity-85">
                Watch a demo
              </a>
              <Link href="/studio" className="rounded-full border border-line px-6 py-3 text-sm font-medium text-fog transition hover:border-mist">
                New Aigis
              </Link>
            </div>
            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6 text-sm">
              <Stat k="Read" v="PDF, XLSX, CSV, images, text" />
              <Stat k="Extract" v="place + time + magnitude" />
              <Stat k="Discover" v="bursts, hotspots, lead/lag" />
            </dl>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-7xl px-6 pb-8 pt-4">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          <Step n="01" title="Ingest" body="Any file. Tables are column-mapped once by the model, then converted row by row. Prose and images go through Muse Spark's vision and structured extraction." />
          <Step n="02" title="Locate and date" body="Each event gets coordinates, a timestamp and a confidence score. Places are geocoded; magnitudes and entities are captured." />
          <Step n="03" title="Discover" body="A pattern engine scores temporal bursts, spatial hotspots, outliers, silences and lead/lag relationships between categories." />
          <Step n="04" title="Design and share" body="In Studio you choose the map look and markers, then save. The view link shows exactly that; only you and your editors can change it." />
        </div>
      </section>

      {/* Demos: public views of saved Aigises */}
      <section id="demos" className="mx-auto max-w-7xl scroll-mt-10 px-6 pb-24 pt-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-dim">Demos</h2>
            <p className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Four stories, <span className="font-serif-display font-normal italic text-mist">one engine.</span>
            </p>
          </div>
          <p className="hidden max-w-sm text-sm text-mist md:block">Each is a saved Aigis. Open the view, scrub the timeline, ask it questions. Make your own in Studio.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SAMPLES.map((s) => (
            <Link
              key={s.id}
              href={`/view/sample-${s.id}`}
              className="card-sheen group glass relative flex min-h-[220px] flex-col rounded-2xl p-6 text-left transition hover:-translate-y-0.5 hover:border-mist/40"
              style={{ color: s.accent }}
            >
              <div className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: s.accent }}>
                {s.tagline}
              </div>
              <div className="mt-2 max-w-[70%] text-2xl font-semibold leading-tight text-fog">{s.title}</div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-mist">{s.blurb}</p>
              <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-dim">
                <span className="font-mono">{fileSummary(s.files)}</span>
                <span className="ml-auto flex items-center gap-1 text-fog opacity-0 transition group-hover:opacity-100">
                  Open view
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between rounded-2xl border border-line bg-ink-2 px-6 py-5">
          <div>
            <div className="text-lg font-semibold">Ready to make your own?</div>
            <div className="text-sm text-mist">Studio turns your files into an Aigis you design, save and share as a view.</div>
          </div>
          <Link href="/studio" className="rounded-full bg-fog px-6 py-3 text-sm font-semibold text-ink hover:opacity-85">
            New Aigis
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-dim">
          <div className="flex items-center gap-2">
            <Logo size={18} /> AIGIS · autonomous geospatial intelligence
          </div>
          <div>Muse Spark and Muse Wonder via Vercel AI Gateway · OpenFreeMap tiles · Photon and Nominatim geocoding (OpenStreetMap)</div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-dim">{k}</dt>
      <dd className="mt-1 text-fog">{v}</dd>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-ink-2 p-6">
      <div className="font-mono text-xs text-glow">{n}</div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-mist">{body}</p>
    </div>
  );
}

function fileSummary(files: string[]) {
  const photos = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length;
  const rest = files.filter((f) => !/\.(jpe?g|png|webp)$/i.test(f));
  return [photos ? `${photos} photos` : null, ...rest].filter(Boolean).join(" + ");
}

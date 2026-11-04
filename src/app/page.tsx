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
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-glow/30 bg-glow/10 px-3.5 py-1.5 text-sm text-glow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow" />
              Meta Global AI Developer Hackathon 2026
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              When maps <span className="font-serif-display font-normal italic text-glow">tell a story.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-xl leading-relaxed text-mist md:text-2xl">
              Drop in reports, spreadsheets, photos or news. Agents built on Muse find every event with a place and a time, hunt for
              patterns, and hand you an animated map you can question in plain language.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a href="#demos" className="inline-flex h-14 w-56 items-center justify-center rounded-full border-2 border-glow bg-glow text-lg font-semibold text-ink shadow-[0_0_48px_rgba(56,189,248,0.45)] transition hover:opacity-90">
                Watch a demo
              </a>
              <Link href="/studio" className="inline-flex h-14 w-56 items-center justify-center rounded-full border-2 border-fog/70 text-lg font-semibold text-fog transition hover:border-fog hover:bg-fog/10">
                New story
              </Link>
            </div>
          </div>
          {/* The pipeline, animated: documents in, Muse in the middle, events landing on the globe. */}
          <div className="relative -mx-6 mt-6 pb-10 md:mx-0 md:mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/workflow-hero.svg" alt="Documents flow into Muse, which extracts events that land on an animated globe" className="block w-full" width={1200} height={470} />
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

      {/* Demos: public views of saved stories */}
      <section id="demos" className="mx-auto max-w-7xl scroll-mt-10 px-6 pb-24 pt-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-dim">Demos</h2>
            <p className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Four stories, <span className="font-serif-display font-normal italic text-mist">one engine.</span>
            </p>
          </div>
          <p className="hidden max-w-sm text-base text-mist md:block">Each is a saved story. Open the view, scrub the timeline, ask it questions. Make your own in Studio.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SAMPLES.map((s) => (
            <Link
              key={s.id}
              href={`/view/sample-${s.id}`}
              className="card-sheen group glass relative flex min-h-[220px] flex-col rounded-2xl p-6 text-left transition hover:-translate-y-0.5 hover:border-mist/40"
              style={{ color: s.accent }}
            >
              <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: s.accent }}>
                {s.tagline}
              </div>
              <div className="mt-2 max-w-[80%] text-3xl font-semibold leading-tight text-fog">{s.title}</div>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-mist">{s.blurb}</p>
              <div className="mt-auto flex items-center gap-2 pt-5 text-sm text-dim">
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
            <div className="text-xl font-semibold">Ready to make your own?</div>
            <div className="text-base text-mist">Studio turns your files into a story you design, save and share as a view.</div>
          </div>
          <Link href="/studio" className="rounded-full bg-fog px-7 py-3.5 text-base font-semibold text-ink hover:opacity-85">
            New story
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-dim">
          <div className="flex items-center gap-2">
            <Logo size={18} /> AIGIS · autonomous geospatial intelligence
          </div>
          <div>Muse Spark and Muse Image via Vercel AI Gateway · OpenFreeMap tiles · Photon and Nominatim geocoding (OpenStreetMap)</div>
        </div>
      </footer>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-ink-2 p-6">
      <div className="font-mono text-sm text-glow">{n}</div>
      <div className="mt-2 text-xl font-semibold">{title}</div>
      <p className="mt-2 text-base leading-relaxed text-mist">{body}</p>
    </div>
  );
}

function fileSummary(files: string[]) {
  const photos = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length;
  const rest = files.filter((f) => !/\.(jpe?g|png|webp)$/i.test(f));
  return [photos ? `${photos} photos` : null, ...rest].filter(Boolean).join(" + ");
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "../Logo";
import { LandingNav } from "../LandingNav";
import type { SessionUser } from "../AccountMenu";
import { ProblemFigure } from "./ProblemFigure";
import { SolutionFigure } from "./SolutionFigure";
import { MarketFigure } from "./MarketFigure";
import { TechnologyFigure } from "./TechnologyFigure";
import { MuseFigure } from "./MuseFigure";

// The pitch as a page: four full-height chapters, each with one animated
// figure that makes the chapter's point. Arrow keys and the rail on the
// left move between chapters, so it can be narrated over without scrolling
// by hand.
const CHAPTERS = [
  { id: "intro", n: "00", label: "Intro" },
  { id: "problem", n: "01", label: "Problem" },
  { id: "solution", n: "02", label: "Solution" },
  { id: "market", n: "03", label: "Market" },
  { id: "technology", n: "04", label: "Technology" },
  { id: "muse", n: "05", label: "Muse" },
] as const;

export function About({ user }: { user: SessionUser }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const i = els.indexOf(en.target as HTMLElement);
          if (en.isIntersecting) {
            en.target.classList.add("in");
            if (en.intersectionRatio > 0.5) setActive(i);
          }
        }
      },
      { threshold: [0.2, 0.55] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const go = (i: number) => refs.current[Math.max(0, Math.min(CHAPTERS.length - 1, i))]?.scrollIntoView({ behavior: "smooth", block: "start" });
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(active + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(active - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <main className="about relative">
      <header className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-ink to-transparent">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={56} />
            <span className="text-2xl font-semibold tracking-[0.2em] md:text-3xl">AIGIS</span>
          </Link>
          <LandingNav user={user} />
        </div>
      </header>

      <ol className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-5 md:left-8 md:flex">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              onClick={() => refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="group flex items-center gap-3 outline-none"
              aria-label={`Go to ${c.label}`}
              aria-current={i === active ? "step" : undefined}
            >
              <span className={`h-2 w-2 rounded-full transition ${i === active ? "scale-125 bg-glow" : "bg-dim/60 group-hover:bg-mist"}`} />
              <span className={`font-mono text-[11px] uppercase tracking-[0.2em] transition ${i === active ? "text-fog" : "text-dim group-hover:text-mist"}`}>{c.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* Intro: the landing hero, so the narration can start where the site does. */}
      <section
        ref={(el) => {
          refs.current[0] = el;
        }}
        id="intro"
        className="chapter relative flex min-h-dvh flex-col justify-center overflow-hidden"
      >
        <div className="absolute inset-0 grid-bg" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 hero-fade-b" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-28 md:pl-36 lg:pl-40">
          <div className="chapter-in mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-glow/30 bg-glow/10 px-3.5 py-1.5 text-sm text-glow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow" />
              Meta Global AI Developer Hackathon 2026
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              When maps <span className="font-serif-display font-normal italic text-glow">tell a story.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-xl leading-relaxed text-mist md:text-2xl">
              Drop in reports, spreadsheets, photos or news. Agents built on Muse find every event with a place and a time, hunt for patterns, and hand you an animated map you can question in plain language.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/#demos" className="inline-flex h-14 w-56 items-center justify-center rounded-full border-2 border-glow bg-glow text-lg font-semibold text-ink shadow-[0_0_48px_rgba(56,189,248,0.45)] transition hover:opacity-90">
                Watch a demo
              </Link>
              <Link href="/studio" className="inline-flex h-14 w-56 items-center justify-center rounded-full border-2 border-fog/70 text-lg font-semibold text-fog transition hover:border-fog hover:bg-fog/10">
                New story
              </Link>
            </div>
          </div>
          <div className="chapter-in relative -mx-6 mt-6 pb-10 md:mx-0 md:mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/workflow-hero.svg" alt="Documents flow into Muse, which extracts events that land on an animated globe" className="block w-full" width={1200} height={470} />
          </div>
        </div>
      </section>

      <Chapter
        ref={(el) => {
          refs.current[1] = el;
        }}
        c={CHAPTERS[1]}
        eyebrow="The world is described in documents"
        title={
          <>
            Everything happens <em>somewhere</em>, at some <em>time</em>. Almost none of it arrives as a map.
          </>
        }
        figure={<ProblemFigure />}
      >
        <ul>
          <li>Reports, spreadsheets, journals, camera rolls, news. The where and the when are in there, buried in prose and columns.</li>
          <li>Turning them into a map is a specialist&apos;s job: geocoders, GIS tools, a week of cleaning.</li>
          <li>80 to 90 percent of enterprise data is unstructured.</li>
          <li>The map that moves through time, the view that makes patterns obvious, is almost never built.</li>
        </ul>
      </Chapter>

      <Chapter
        ref={(el) => {
          refs.current[2] = el;
        }}
        c={CHAPTERS[2]}
        eyebrow="Drop in files, get a story"
        title={
          <>
            AIGIS reads the files, finds every <em>located, dated</em> event, and plays it back on a map you can question.
          </>
        }
        figure={<SolutionFigure />}
      >
        <ul>
          <li>Any input: PDF, CSV, XLSX, Markdown, photos with EXIF, scans and charts.</li>
          <li>Agents built on Muse Spark extract every event with place, time, value and a confidence score.</li>
          <li>A pattern engine scores bursts, hotspots, outliers and silences.</li>
          <li>An animated story: scrub it, design its look, share a link.</li>
          <li>Ask in plain language; the model answers with evidence and moves the map itself.</li>
        </ul>
      </Chapter>

      <Chapter
        ref={(el) => {
          refs.current[3] = el;
        }}
        c={CHAPTERS[3]}
        eyebrow="Who needs this"
        title={
          <>
            Geospatial analytics is a <em>specialist</em> market today. The people with the documents are not specialists.
          </>
        }
        figure={<MarketFigure />}
      >
        <ul>
          <li>Geospatial analytics: about 100 billion dollars a year, growing 11 to 13 percent, built for trained GIS users.</li>
          <li>AIGIS moves the starting line: anyone with a folder of files gets the animated map, the findings and the conversation.</li>
          <li>Newsrooms, supply chain and insurance analysts, public health, researchers and historians, tour and event operators, brands, families with a camera roll.</li>
        </ul>
      </Chapter>

      <Chapter
        ref={(el) => {
          refs.current[4] = el;
        }}
        c={CHAPTERS[4]}
        eyebrow="How it is built"
        title={
          <>
            Next.js on Vercel, Muse through the <em>AI Gateway</em>, open geodata for everything else.
          </>
        }
        figure={<TechnologyFigure />}
      >
        <ul>
          <li>Vercel Functions run the ingest pipeline, the pattern engine and the chat agent with the AI SDK.</li>
          <li>Meta&apos;s Muse models are reached through the Vercel AI Gateway: one key, zero data retention, no other provider.</li>
          <li>Deterministic and open: MapLibre, OpenFreeMap tiles, Photon and Nominatim geocoding, Natural Earth relief, Vercel Blob.</li>
        </ul>
      </Chapter>

      <Chapter
        ref={(el) => {
          refs.current[5] = el;
        }}
        c={CHAPTERS[5]}
        eyebrow="Six Muse Spark jobs, one Muse Image job"
        title={
          <>
            Every <em>judgment</em> in AIGIS is a Muse call.
          </>
        }
        figure={<MuseFigure />}
      >
        <ul>
          <li>Six Muse Spark 1.3 jobs and one Muse Image 1.0 job, each a single call with a typed schema.</li>
          <li>Everything the model returns is validated before it reaches the map; the geocoders, statistics and rendering only give it evidence and draw what it says.</li>
          <li>Reasoning effort is set per call, so extraction answers in seconds and the agent moves the map as it talks.</li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/#demos" className="rounded-full bg-glow px-6 py-2.5 text-sm font-semibold text-ink hover:opacity-90">
            Watch a demo
          </Link>
          <Link href="/studio" className="rounded-full border border-fog/60 px-6 py-2.5 text-sm font-semibold text-fog hover:bg-fog/10">
            Make a story
          </Link>
        </div>
      </Chapter>
    </main>
  );
}

function Chapter({
  ref,
  c,
  eyebrow,
  title,
  figure,
  children,
}: {
  ref: (el: HTMLElement | null) => void;
  c: (typeof CHAPTERS)[number];
  eyebrow: string;
  title: ReactNode;
  figure: ReactNode;
  children: ReactNode;
}) {
  return (
    <section ref={ref} id={c.id} className="chapter relative mx-auto flex min-h-dvh max-w-[1500px] flex-col justify-center px-6 pb-16 pt-24 md:px-10 md:pl-36 lg:pl-40">
      <div className="chapter-in flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-glow">
        <span>{c.n}</span>
        <span className="h-px w-8 bg-glow/60" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="chapter-in text-balance mt-5 max-w-5xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-[3.4rem] [&_em]:font-serif-display [&_em]:font-normal [&_em]:italic [&_em]:text-glow">{title}</h2>
      <div className="chapter-in mt-8 grid gap-10 text-xl leading-snug text-mist md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center md:text-2xl lg:gap-14">
        <div className="space-y-6 [&_li]:relative [&_li]:pl-7 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.55em] [&_li]:before:h-2.5 [&_li]:before:w-2.5 [&_li]:before:rounded-full [&_li]:before:bg-glow [&_ul]:space-y-4">{children}</div>
        <div className="figure">{figure}</div>
      </div>
    </section>
  );
}

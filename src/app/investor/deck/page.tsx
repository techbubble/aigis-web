import Link from "next/link";
import { docUrl, hasDoc } from "../config";

export const dynamic = "force-dynamic";

// The deck: the PDF when one is in public/investor, and always the
// narrated pitch page it was built from.
export default function DeckPage() {
  const pdf = hasDoc("deck");
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-4">
      <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#a78bfa" }}>
        Deck
      </div>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">The pitch</h1>
      <p className="mt-4 max-w-2xl text-lg text-mist">
        {pdf ? "The slides, and the narrated page they were built from." : "The pitch lives as a narrated page: five chapters, each with one animated figure that makes its point. Arrow keys move between chapters."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/about" className="rounded-full bg-glow px-6 py-3 text-sm font-semibold text-ink hover:opacity-90">
          Open the narrated pitch
        </Link>
        {pdf && (
          <a href={docUrl("deck")} target="_blank" rel="noreferrer" className="rounded-full border border-fog/60 px-6 py-3 text-sm font-semibold text-fog hover:bg-fog/10">
            Download the PDF
          </a>
        )}
      </div>
      {pdf && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-ink-2">
          <iframe src={docUrl("deck")} title="AIGIS deck" className="h-[80vh] w-full" />
        </div>
      )}
    </section>
  );
}

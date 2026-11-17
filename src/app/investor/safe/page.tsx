import { LEGEND, PREAMBLE, SAFE, SECTIONS, WITNESS } from "@/lib/safe/terms";
import { SafeForm } from "./SafeForm";

export const dynamic = "force-dynamic";

const letters = "abcdefghijklmnopqrstuvwxyz";

// The agreement, read online and signed online. The instrument is fixed;
// Appendix A is the only part a investor completes.
export default function SafePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-4">
      <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#34d399" }}>
        SAFE
      </div>
      <h1 className="mt-3 whitespace-nowrap text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">Simple Agreement for Future Equity</h1>
      <p className="mt-4 max-w-2xl text-lg text-mist">
        Read the agreement, complete Appendix A, and sign. The executed PDF is emailed to you at once, with a copy to {SAFE.company}.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/api/investor/safe" className="rounded-full border border-fog/60 px-6 py-3 text-sm font-semibold text-fog hover:bg-fog/10">
          Download the SAFE (PDF)
        </a>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <article className="rounded-2xl bg-white p-6 text-ink shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] md:p-8">
          <p className="rounded-md border border-ink/40 p-3 text-[11px] uppercase leading-snug text-ink/80">{LEGEND}</p>
          <h2 className="mt-6 text-center font-serif-display text-2xl tracking-[0.08em] text-ink">SIMPLE AGREEMENT FOR FUTURE EQUITY</h2>
          <p className="mt-1 text-center text-sm text-ink/70">
            {SAFE.company}
            <br />
            {SAFE.address}
          </p>
          <p className="mt-6 text-sm leading-relaxed text-ink/85">{PREAMBLE}</p>
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink">{sec.title}</h3>
              <ol className="mt-2 space-y-2">
                {sec.clauses.map((c, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink/85">
                    <span className="w-4 shrink-0 text-ink/50">{letters[i]}.</span>
                    <span>
                      {c.label && <b className="text-ink">{c.label} </b>}
                      {c.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="mt-6 text-sm leading-relaxed text-ink/85">{WITNESS}</p>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-ink/20 pt-4 text-sm">
            <dt className="text-ink/60">Discount Rate</dt>
            <dd className="text-ink">{SAFE.discountRate}</dd>
            <dt className="text-ink/60">For the Company</dt>
            <dd className="text-ink">
              {SAFE.signer.name}, {SAFE.signer.title}
            </dd>
          </dl>
        </article>
        <div id="appendix" className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
          <SafeForm />
        </div>
      </div>
    </section>
  );
}

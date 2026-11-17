import Link from "next/link";
import { hasDoc } from "./config";
import { SAFE } from "@/lib/safe/terms";

export const dynamic = "force-dynamic";

// The folder: four tiles. Each is a door to one thing an investor needs.
export default function InvestorsPage() {
  const tiles = [
    {
      href: "/investor/vision",
      title: "Vision",
      color: "#38bdf8",
      body: "What AIGIS is, why now, and where it goes: the memo behind the product.",
      status: "Read it",
      ready: true,
    },
    {
      href: "/investor/deck",
      title: "Deck",
      color: "#a78bfa",
      body: "The pitch as slides, and as the narrated page it was built from.",
      status: hasDoc("deck") ? "View the PDF" : "Narrated page",
      ready: true,
    },
    {
      href: "/investor/safe",
      title: "SAFE",
      color: "#34d399",
      body: "Read the agreement, complete Appendix A, and sign online. The executed PDF is emailed to you.",
      status: "Read, download or sign",
      ready: true,
    },
    {
      href: SAFE.wirePdf,
      external: true,
      title: "Payment",
      color: "#fbbf24",
      body: "Bank details for ACH or wire, once the agreement is signed. Opens the PDF in a new window.",
      status: "Open bank details (PDF)",
      ready: true,
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
      <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
        Maps that <span className="font-serif-display font-normal italic text-glow">think.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-mist">Everything you need to evaluate AIGIS and take part in the round, in one private place.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            target={t.external ? "_blank" : undefined}
            rel={t.external ? "noreferrer" : undefined}
            className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl border p-8 transition hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${t.color} 38%, var(--ink-3)) 0%, color-mix(in srgb, ${t.color} 10%, var(--ink-2)) 70%)`,
              borderColor: `color-mix(in srgb, ${t.color} 45%, transparent)`,
              boxShadow: `0 24px 60px -30px ${t.color}`,
            }}
          >
            <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.color }} />
            <div>
              <div className="text-3xl font-semibold tracking-tight text-fog md:text-4xl">{t.title}</div>
              <p className="mt-3 max-w-md text-base leading-relaxed text-mist">{t.body}</p>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: t.ready ? t.color : "var(--dim)" }}>
                {t.status}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition group-hover:scale-110" style={{ background: t.color }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

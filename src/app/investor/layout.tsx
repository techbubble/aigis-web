import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "AIGIS for investors",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// Linked from the nav, kept out of search indexes.
export default function InvestorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3" aria-label="AIGIS home">
            <Logo size={44} />
            <span className="text-xl font-semibold tracking-[0.2em]">AIGIS</span>
          </Link>
          <Link href="/investor" className="ml-2 rounded-full border border-line px-3 py-1 text-xs uppercase tracking-[0.2em] text-mist hover:text-fog">
            Investors
          </Link>
        </div>
        <Link href="/" className="text-sm text-mist hover:text-fog">
          Home
        </Link>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-dim">For investors. Not indexed by search engines.</footer>
    </main>
  );
}

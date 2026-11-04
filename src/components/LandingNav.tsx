"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu, type SessionUser } from "./AccountMenu";

const LINKS = [
  { href: "/#demos", label: "Demos" },
  { href: "/about", label: "About" },
  { href: "/studio", label: "Studio" },
];

// The landing header's navigation: inline links on wide screens, a
// hamburger that drops a panel on phones.
export function LandingNav({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <nav className="hidden items-center gap-8 text-lg text-mist md:flex md:text-xl">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-fog">
            {l.label}
          </Link>
        ))}
        <span className="rounded-full border border-line px-4 py-1.5 text-base text-dim">Built on Muse</span>
        <AccountMenu user={user} />
      </nav>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-fog md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M5 5l12 12M17 5L5 17" /> : <path d="M3 6h16M3 11h16M3 16h16" />}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 px-6 pb-4 md:hidden">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-2 text-lg shadow-2xl">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line px-5 py-4 text-fog last:border-b-0 hover:bg-fog/10">
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between px-5 py-3 text-sm text-dim">
              Built on Muse
              <AccountMenu user={user} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

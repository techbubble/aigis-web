"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export type SessionUser = { email: string; name: string } | null;

// Who is signed in, with a way out; or a way in. Used in the landing header
// and the explorer top bar.
export function AccountMenu({ user, compact = false }: { user: SessionUser; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    await fetch("/api/auth/signout", { method: "POST" });
    setOpen(false);
    setBusy(false);
    if (pathname.startsWith("/studio")) router.replace("/");
    router.refresh();
  };
  const size = compact ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-base";
  if (!user) {
    return (
      <Link href={`/signin?next=${encodeURIComponent(pathname)}`} className={`rounded-full border border-line text-mist hover:border-fog hover:text-fog ${size}`}>
        Sign in
      </Link>
    );
  }
  return (
    <span className="relative">
      <button onClick={() => setOpen((v) => !v)} className={`flex items-center gap-2 rounded-full border border-line text-mist hover:border-fog hover:text-fog ${size}`} aria-haspopup="menu" aria-expanded={open} title={user.email}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-glow text-[11px] font-semibold uppercase text-ink">{user.name.slice(0, 1)}</span>
        <span className="max-w-[12ch] truncate">{user.name}</span>
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-line bg-ink-2 p-1.5 text-sm shadow-2xl">
            <div className="truncate px-2.5 py-2 text-xs text-dim">{user.email}</div>
            <Link href="/studio" onClick={() => setOpen(false)} className="block rounded-lg px-2.5 py-2 text-fog hover:bg-ink-3" role="menuitem">
              Studio
            </Link>
            <button onClick={signOut} disabled={busy} className="block w-full rounded-lg px-2.5 py-2 text-left text-fog hover:bg-ink-3" role="menuitem">
              {busy ? "Signing out" : "Sign out"}
            </button>
          </div>
        </>
      )}
    </span>
  );
}

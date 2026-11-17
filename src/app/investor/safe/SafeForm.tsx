"use client";

import { useState } from "react";
import { SAFE } from "@/lib/safe/terms";

// Appendix A, completed online. On success the executed PDF is emailed to
// the investor with a copy to the company.
export function SafeForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ name: "", address: "", amount: SAFE.defaultAmount, date: today, email: "", signature: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((o) => ({ ...o, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/investor/safe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
      const j = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setDone(f.email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: "#34d399", background: "linear-gradient(135deg, color-mix(in srgb, #34d399 24%, var(--ink-3)) 0%, var(--ink-2) 70%)" }}>
        <div className="text-xl font-semibold text-fog">Agreement executed</div>
        <p className="mt-2 text-base text-mist">
          The signed PDF has been emailed to <span className="text-fog">{done}</span> along with payment instructions and the bank details.
        </p>
        <a href="/investor/payment" className="mt-5 inline-flex rounded-full bg-glow px-6 py-3 text-sm font-semibold text-ink hover:opacity-90">
          Payment instructions
        </a>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-lg border border-ink/30 bg-white px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-3/60 focus:border-glow";
  const label = "block whitespace-nowrap text-xs font-medium uppercase tracking-[0.15em] text-ink/60";
  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 text-ink shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]">
      <div className="font-serif-display text-2xl text-ink">Appendix A</div>
      <p className="mt-1 text-sm text-ink/70">Everything above is fixed. Only this appendix is yours to complete.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="safe-name" className={label}>Investor full legal name</label>
          <input id="safe-name" value={f.name} onChange={(e) => set("name", e.target.value)} className={field} autoComplete="name" required />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="safe-address" className={label}>Mailing address</label>
          <input id="safe-address" value={f.address} onChange={(e) => set("address", e.target.value)} className={field} autoComplete="street-address" required />
        </div>
        <div>
          <label htmlFor="safe-amount" className={label}>Amount (USD)</label>
          <input id="safe-amount" value={f.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9]/g, ""))} className={field} inputMode="numeric" required />
        </div>
        <div>
          <label htmlFor="safe-date" className={label}>Date</label>
          <input id="safe-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={field} required />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="safe-email" className={label}>Email</label>
          <input id="safe-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={field} autoComplete="email" required />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="safe-signature" className={label}>Signature: type your full name</label>
          <input id="safe-signature" value={f.signature} onChange={(e) => set("signature", e.target.value)} className={`${field} font-serif-display text-2xl italic whitespace-nowrap`} required />
        </div>
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm text-ink/80">
        <input id="safe-consent" type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1 h-4 w-4 accent-[#34d399]" required />
        <span>
          I have read the agreement, I make the representations in Section 4, and I agree that typing my name is my electronic signature and that the executed agreement may be delivered to me by email.
        </span>
      </label>
      {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="rounded-full px-7 py-3 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-50" style={{ background: "#34d399" }}>
          {busy ? "Signing" : "Sign and send"}
        </button>
        <span className="text-xs text-ink/60">The signed PDF goes to your email with a copy to {SAFE.company}.</span>
      </div>
    </form>
  );
}

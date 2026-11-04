"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Two steps: an email address, then the six-digit code sent to it.
export function SignIn({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (url: string, body: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { error?: string; token?: string; ok?: boolean };
      if (!res.ok) {
        setError(j.error ?? "Something went wrong");
        return null;
      }
      return j;
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const j = await post("/api/auth/send", { email });
    if (j?.token) {
      setToken(j.token);
      setCode("");
    }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const j = await post("/api/auth/verify", { email, code, token });
    if (j?.ok) {
      router.replace(next);
      router.refresh();
    }
  };

  const field = "mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 text-lg text-fog outline-none placeholder:text-dim focus:border-glow";
  const button = "mt-5 w-full rounded-full bg-glow py-3 text-base font-semibold text-ink transition hover:opacity-90 disabled:opacity-60";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-7 shadow-2xl">
      {!token ? (
        <form onSubmit={send}>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1.5 text-sm text-mist">Enter your email. A one-time code will be sent to it; no password.</p>
          <label className="mt-6 block text-xs font-medium uppercase tracking-[0.2em] text-dim">
            Email
            <input type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
          </label>
          <button type="submit" disabled={busy || !email} className={button}>
            {busy ? "Sending" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="mt-1.5 text-sm text-mist">
            A 6-digit code was sent to <span className="text-fog">{email}</span>. It expires in 10 minutes.
          </p>
          <label className="mt-6 block text-xs font-medium uppercase tracking-[0.2em] text-dim">
            Code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className={`${field} text-center font-mono text-2xl tracking-[0.5em]`}
            />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className={button}>
            {busy ? "Checking" : "Sign in"}
          </button>
          <div className="mt-4 flex justify-between text-sm text-dim">
            <button type="button" onClick={() => (setToken(null), setError(null))} className="hover:text-fog">
              Change email
            </button>
            <button type="button" disabled={busy} onClick={send} className="hover:text-fog">
              Resend code
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

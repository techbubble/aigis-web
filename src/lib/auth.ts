import { cookies } from "next/headers";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { Dataset } from "./types";

// Accounts are email addresses, proven by a one-time code sent to them.
// Sessions and codes are both stateless: HMAC-signed with AUTH_SECRET, so
// nothing has to be stored server side.
export type User = { id: string; email: string; name: string };

const COOKIE = "aigis_session";
const SESSION_MS = 30 * 24 * 3600 * 1000;
const CODE_MS = 10 * 60 * 1000;
// Stories saved before accounts existed carry owner "owner" or no owner at
// all. They belong to the admin address.
const LEGACY_OWNER = "owner";
const admin = () => (process.env.AUTH_ADMIN_EMAIL ?? "").trim().toLowerCase();

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.SMTP_PASS;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
function mac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}
function sign(payload: object): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${mac(body)}`;
}
function open<T>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = mac(body);
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    return JSON.parse(unb64(body)) as T;
  } catch {
    return null;
  }
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254 ? e : null;
}

function userFor(email: string): User {
  return { id: email, email, name: email.split("@")[0] };
}

// One-time code. The token returned to the browser carries a hash of the
// code and its expiry; nothing is kept on the server.
export function issueCode(email: string): { code: string; token: string } {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const x = Date.now() + CODE_MS;
  const token = sign({ e: email, x, h: mac(`${email}|${code}|${x}`) });
  return { code, token };
}

// "expired" and "wrong" are told apart so the sign-in form can say which.
export function verifyCode(email: string, code: string, token: string): "ok" | "expired" | "wrong" {
  const t = open<{ e: string; x: number; h: string }>(token);
  if (!t || t.e !== email) return "wrong";
  if (t.x < Date.now()) return "expired";
  const want = mac(`${email}|${code.trim()}|${t.x}`);
  return want.length === t.h.length && timingSafeEqual(Buffer.from(want), Buffer.from(t.h)) ? "ok" : "wrong";
}

export function sessionToken(email: string): string {
  return sign({ e: email, x: Date.now() + SESSION_MS });
}

export async function startSession(email: string): Promise<User> {
  (await cookies()).set({
    name: COOKIE,
    value: sessionToken(email),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
  return userFor(email);
}

export async function endSession(): Promise<void> {
  (await cookies()).set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const s = open<{ e: string; x: number }>(raw);
  if (!s || s.x < Date.now() || !normalizeEmail(s.e)) return null;
  return userFor(s.e);
}

export function isOwner(owner: string | undefined, user: User | null): boolean {
  if (!user) return false;
  if (!owner || owner === LEGACY_OWNER) return !!admin() && user.id === admin();
  return owner === user.id;
}

export function canEdit(ds: Pick<Dataset, "owner" | "editors">, user: User | null): boolean {
  if (!user) return false;
  return isOwner(ds.owner, user) || (ds.editors ?? []).includes(user.id);
}

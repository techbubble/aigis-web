import { normalizeEmail, startSession, verifyCode } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/verify { email, code, token }  -> starts a session when the code matches.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; code?: unknown; token?: unknown };
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  const token = typeof body.token === "string" ? body.token : "";
  if (!email || code.length !== 6 || !token) return Response.json({ error: "Enter the 6-digit code" }, { status: 400 });
  const result = verifyCode(email, code, token);
  if (result === "expired") return Response.json({ error: "That code has expired. Send a new one." }, { status: 401 });
  if (result !== "ok") return Response.json({ error: "That code does not match. Use the code from the newest email; each new send replaces the previous one." }, { status: 401 });
  const user = await startSession(email);
  return Response.json({ ok: true, user: { email: user.email, name: user.name } });
}

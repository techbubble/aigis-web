import { issueCode, normalizeEmail } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

// POST /api/auth/send { email }  -> emails a one-time code; returns the token the code is checked against.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  const { code, token } = issueCode(email);
  try {
    await sendMail(email, `${code} is your AIGIS sign-in code`, `Your AIGIS sign-in code is ${code}. It expires in 10 minutes.\n\nIf you did not ask for it, ignore this message.`);
  } catch (err) {
    console.error("[auth] send failed", err);
    return Response.json({ error: "The code could not be sent. Try again in a moment." }, { status: 502 });
  }
  return Response.json({ token });
}

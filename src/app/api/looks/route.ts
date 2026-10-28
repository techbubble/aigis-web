import { designLook } from "@/lib/map/design";
import { listLooks, saveLook } from "@/lib/looks";
import { currentUser } from "@/lib/auth";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listLooks());
}

// POST /api/looks { prompt }  -> designs, stores and returns a new look.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 600) : "";
  if (!prompt) return Response.json({ error: "Describe the look" }, { status: 400 });
  const user = await currentUser();
  try {
    const look = await designLook(prompt, user.id);
    await saveLook(look);
    return Response.json(look);
  } catch (err) {
    return Response.json({ error: (err as Error).message ?? "Design failed" }, { status: 502 });
  }
}

import { deleteLook, loadLook, saveLook } from "@/lib/looks";
import { currentUser, isOwner } from "@/lib/auth";
import { paintTexture, TEXTURE_SCALE } from "@/lib/map/design";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// PATCH /api/looks/:id { name?, repaint? }  Rename a look, or repaint its texture.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const look = await loadLook(id);
  if (!look) return Response.json({ error: "Not found" }, { status: 404 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  if (!isOwner(look.owner, user)) return Response.json({ error: "Not allowed" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; repaint?: unknown };
  if (typeof body.name === "string" && body.name.trim()) look.name = body.name.trim().slice(0, 60);
  if (body.repaint === true) {
    const prompt =
      look.texturePrompt ||
      `the physical surface a map in the style "${look.prompt ?? look.name}" would be printed or painted on, seen so close that only its material shows: uniform fine grain, even density everywhere, no composition, no large strokes or shapes`;
    try {
      const url = await paintTexture(look.id, prompt);
      look.texturePrompt = prompt;
      look.texture = { url, opacity: look.texture?.opacity ?? 0.4, blend: look.texture?.blend ?? "multiply", scale: TEXTURE_SCALE };
    } catch (err) {
      return Response.json({ error: (err as Error).message ?? "Repaint failed" }, { status: 502 });
    }
  }
  await saveLook(look);
  return Response.json(look);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const look = await loadLook(id);
  if (!look) return Response.json({ ok: true });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  if (!isOwner(look.owner, user)) return Response.json({ error: "Not allowed" }, { status: 403 });
  await deleteLook(id);
  return Response.json({ ok: true });
}

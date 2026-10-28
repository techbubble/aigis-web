import { deleteLook, loadLook, saveLook } from "@/lib/looks";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/looks/:id { name? }  Rename a look you made.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const look = await loadLook(id);
  if (!look) return Response.json({ error: "Not found" }, { status: 404 });
  const user = await currentUser();
  if (look.owner && look.owner !== user.id) return Response.json({ error: "Not allowed" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  if (typeof body.name === "string" && body.name.trim()) look.name = body.name.trim().slice(0, 60);
  await saveLook(look);
  return Response.json(look);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const look = await loadLook(id);
  if (!look) return Response.json({ ok: true });
  const user = await currentUser();
  if (look.owner && look.owner !== user.id) return Response.json({ error: "Not allowed" }, { status: 403 });
  await deleteLook(id);
  return Response.json({ ok: true });
}

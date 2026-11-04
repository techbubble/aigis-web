import { deleteDataset, loadDataset, saveDataset } from "@/lib/store";
import { themeById } from "@/lib/map/styles";
import { loadLook } from "@/lib/looks";
import { canEdit, currentUser } from "@/lib/auth";
import { SHAPE_IDS } from "@/lib/markers";
import { DEFAULT_MARKER, type MarkerShape } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await loadDataset(id);
  if (!ds) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(ds);
}

// PATCH /api/datasets/:id  { theme?, marker?, name?, subtitle? }  -> Studio save. Owner or editors only.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await loadDataset(id);
  if (!ds) return Response.json({ error: "Not found" }, { status: 404 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  if (!canEdit(ds, user)) return Response.json({ error: "Not allowed" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { theme?: unknown; marker?: unknown; name?: unknown; subtitle?: unknown };
  if (typeof body.theme === "string" && (themeById(body.theme).id === body.theme || (await loadLook(body.theme)))) ds.theme = body.theme;
  if (body.marker && typeof body.marker === "object") {
    const m = body.marker as { shape?: unknown; color?: unknown; sizeByValue?: unknown; glow?: unknown; trail?: unknown };
    const shape = SHAPE_IDS.includes(m.shape as MarkerShape) ? (m.shape as MarkerShape) : ds.marker?.shape ?? DEFAULT_MARKER.shape;
    const color = typeof m.color === "string" && /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : ds.marker?.color ?? DEFAULT_MARKER.color;
    ds.marker = {
      shape,
      color,
      sizeByValue: typeof m.sizeByValue === "boolean" ? m.sizeByValue : ds.marker?.sizeByValue ?? true,
      glow: typeof m.glow === "boolean" ? m.glow : ds.marker?.glow ?? true,
      trail: typeof m.trail === "boolean" ? m.trail : ds.marker?.trail ?? false,
    };
  }
  if (typeof body.name === "string" && body.name.trim()) ds.name = body.name.trim().slice(0, 120);
  if (typeof body.subtitle === "string") ds.subtitle = body.subtitle.trim().slice(0, 200) || undefined;
  if (!ds.owner) ds.owner = user.id;
  ds.savedAt = new Date().toISOString();
  await saveDataset(ds);
  return Response.json({ ok: true, name: ds.name, subtitle: ds.subtitle ?? null, theme: ds.theme ?? null, marker: ds.marker ?? null, savedAt: ds.savedAt });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await loadDataset(id);
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  if (ds && !canEdit(ds, user)) return Response.json({ error: "Not allowed" }, { status: 403 });
  await deleteDataset(id);
  return Response.json({ ok: true });
}

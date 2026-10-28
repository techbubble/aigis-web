import { listDatasets, loadDataset, saveDataset } from "@/lib/store";
import { canEdit, currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listDatasets());
}

// PATCH /api/datasets  { order: string[] }  -> sets the order of appearance of the caller's Aigises.
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { order?: unknown };
  if (!Array.isArray(body.order) || !body.order.every((x) => typeof x === "string")) return Response.json({ error: "order must be a list of ids" }, { status: 400 });
  const user = await currentUser();
  let i = 0;
  for (const id of body.order as string[]) {
    const ds = await loadDataset(id);
    if (!ds || !canEdit(ds, user)) continue;
    ds.position = i++;
    await saveDataset(ds);
  }
  return Response.json({ ok: true, count: i });
}

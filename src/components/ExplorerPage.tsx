import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listDatasets, loadDataset } from "@/lib/store";
import { Explorer } from "@/components/Explorer";
import { sampleById } from "@/lib/samples";
import { canEdit, currentUser } from "@/lib/auth";
import { listLooks } from "@/lib/looks";

// Shared loader for /studio/[id] and /view/[id].
export async function ExplorerPage({ id, mode }: { id: string; mode: "studio" | "view" }) {
  const ds = await loadDataset(id);
  if (!ds) notFound();
  const user = await currentUser();
  if (mode === "studio" && !user) redirect(`/signin?next=${encodeURIComponent(`/studio/${id}`)}`);
  const editable = canEdit(ds, user);
  if (mode === "studio" && !editable) {
    return (
      <main className="flex flex-1 items-center justify-center p-10 text-center">
        <div>
          <h1 className="text-xl font-semibold">You do not have edit access to {ds.name}</h1>
          <Link href={`/view/${id}`} className="mt-6 inline-block text-glow">
            Open the viewer
          </Link>
        </div>
      </main>
    );
  }
  const sample = id.startsWith("sample-") ? sampleById(id.slice(7)) : null;
  if (!ds.events.length && mode === "view") {
    return (
      <main className="flex flex-1 items-center justify-center p-10 text-center">
        <div>
          <h1 className="text-xl font-semibold">No located, dated events were found in {ds.name}</h1>
          <p className="mt-2 text-mist">
            Dropped: {ds.summary.dropped.noTime} without a date, {ds.summary.dropped.noLocation} without a location, {ds.summary.dropped.lowConfidence} low confidence.
          </p>
          <Link href={`/studio/${id}`} className="mt-6 inline-block text-glow">
            Add sources in Studio
          </Link>
        </div>
      </main>
    );
  }
  const [all, looks] = await Promise.all([listDatasets(), listLooks()]);
  const library = all.filter((d) => canEdit(d, user) && !d.id.startsWith("sample-"));
  return (
    <Explorer
      dataset={ds}
      suggestions={sample?.questions ?? []}
      defaultTheme={ds.theme || sample?.theme || "arctic"}
      mode={mode}
      editable={editable}
      user={user && { email: user.email, name: user.name }}
      library={library}
      looks={looks}
    />
  );
}

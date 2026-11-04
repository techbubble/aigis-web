import { listDatasets } from "@/lib/store";
import { listLooks } from "@/lib/looks";
import { Explorer } from "@/components/Explorer";
import type { Dataset } from "@/lib/types";
import { redirect } from "next/navigation";
import { canEdit, currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Studio opens straight onto an empty story: the map, the design tools and
// the sources panel. The first upload creates and names it.
export default async function StudioPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fstudio");
  const [all, looks] = await Promise.all([listDatasets(), listLooks()]);
  const library = all.filter((d) => canEdit(d, user) && !d.id.startsWith("sample-"));
  const blank: Dataset = {
    id: "",
    name: "Untitled story",
    createdAt: new Date().toISOString(),
    sources: [],
    events: [],
    summary: { count: 0, tMin: null, tMax: null, categories: [], topPlaces: [], bbox: null, dropped: { noTime: 0, noLocation: 0, lowConfidence: 0 } },
  };
  return <Explorer dataset={blank} suggestions={[]} defaultTheme="arctic" mode="studio" editable user={{ email: user.email, name: user.name }} library={library} looks={looks} />;
}

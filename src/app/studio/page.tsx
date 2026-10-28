import { SAMPLES } from "@/lib/samples";
import { listDatasets } from "@/lib/store";
import { listLooks } from "@/lib/looks";
import { Explorer } from "@/components/Explorer";
import type { Dataset } from "@/lib/types";

export const dynamic = "force-dynamic";

// Studio opens straight onto an empty Aigis: the map, the design tools and
// the sources panel. The first upload (or a demo) creates and names it.
export default async function StudioPage() {
  const [library, looks] = await Promise.all([listDatasets(), listLooks()]);
  const blank: Dataset = {
    id: "",
    name: "Untitled Aigis",
    createdAt: new Date().toISOString(),
    sources: [],
    events: [],
    summary: { count: 0, tMin: null, tMax: null, categories: [], topPlaces: [], bbox: null, dropped: { noTime: 0, noLocation: 0, lowConfidence: 0 } },
  };
  return <Explorer dataset={blank} suggestions={[]} defaultTheme="arctic" mode="studio" editable samples={SAMPLES} library={library} looks={looks} />;
}

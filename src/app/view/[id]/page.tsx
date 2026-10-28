import { ExplorerPage } from "@/components/ExplorerPage";

export const dynamic = "force-dynamic";

export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExplorerPage id={id} mode="view" />;
}

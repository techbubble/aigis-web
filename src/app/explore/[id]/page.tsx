import { redirect } from "next/navigation";

// Legacy URL: the viewer lives at /view/[id] now.
export default async function ExploreRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/view/${id}`);
}

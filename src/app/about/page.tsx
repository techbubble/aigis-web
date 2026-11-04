import type { Metadata } from "next";
import { About } from "@/components/about/About";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About AIGIS",
  description: "Problem, solution, market and technology: how AIGIS turns documents into animated maps with Meta's Muse models.",
};

export default async function AboutPage() {
  const user = await currentUser();
  return <About user={user && { email: user.email, name: user.name }} />;
}

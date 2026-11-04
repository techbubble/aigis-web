import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SignIn } from "@/components/SignIn";

export const dynamic = "force-dynamic";

// Only same-site paths are honored as the place to return to.
function safeNext(raw: string | undefined): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/studio";
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 grid-bg" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={44} />
          <span className="text-xl font-semibold tracking-[0.2em]">AIGIS</span>
        </Link>
      </header>
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
        <SignIn next={next} />
      </div>
    </main>
  );
}

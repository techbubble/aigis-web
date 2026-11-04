import { readMultipart, runIngest } from "@/lib/ingest/pipeline";
import { ndjsonStream } from "@/lib/ndjson";
import { currentUser } from "@/lib/auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const { name, subtitle, files, docDate, theme } = readMultipart(form);
  if (!files.length) return Response.json({ error: "No files" }, { status: 400 });
  const inputs = await Promise.all(files);
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to build a story" }, { status: 401 });
  return ndjsonStream((emit) => runIngest({ name, subtitle, files: inputs, docDate, theme, owner: user.id }, emit));
}

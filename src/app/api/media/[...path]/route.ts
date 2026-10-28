import { readLocalMedia } from "@/lib/media";

// Serves locally stored photo derivatives (dev / self-hosted). On Vercel the
// URLs point at Blob directly and this route is not used.
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.length !== 2) return new Response("Not found", { status: 404 });
  const buf = await readLocalMedia(path[0], path[1]);
  if (!buf) return new Response("Not found", { status: 404 });
  const type = path[1].endsWith(".png") ? "image/png" : path[1].endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(buf), { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" } });
}

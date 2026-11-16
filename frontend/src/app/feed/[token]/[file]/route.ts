import { publicBackendFetch } from "@/lib/backend";

const PASS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
];

// Episode audio for podcast apps, with Range support so they can seek and resume.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string; file: string }> },
) {
  const { token, file } = await ctx.params;
  const episodeId = file.replace(/\.mp3$/, "");
  const headers = new Headers();
  const range = req.headers.get("range");
  if (range) headers.set("range", range);
  const upstream = await publicBackendFetch(
    `/public/feed/${encodeURIComponent(token)}/${encodeURIComponent(episodeId)}.mp3`,
    { headers },
  );
  const out = new Headers({ "x-robots-tag": "noindex" });
  for (const name of PASS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

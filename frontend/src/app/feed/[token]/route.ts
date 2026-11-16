import { publicBackendFetch } from "@/lib/backend";

// Private podcast feed (RSS). Podcast apps fetch this without signing in; the token is the key.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const upstream = await publicBackendFetch(
    `/public/feed/${encodeURIComponent(token)}`,
  );
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/rss+xml",
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}

import { publicBackendFetch } from "@/lib/backend";

// RFC 8058 one-click unsubscribe target (mail clients POST here from their own button).
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const upstream = await publicBackendFetch(
    `/public/unsubscribe/${encodeURIComponent(token)}`,
    {
      method: "POST",
    },
  );
  return new Response(null, { status: upstream.ok ? 200 : upstream.status });
}

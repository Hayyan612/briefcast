import { ImageResponse } from "next/og";

import { publicBackendFetch } from "@/lib/backend";
import { COVER_COLORS, COVER_ICONS, resolveCover } from "@/lib/cover";

const SIZE = 1400; // Apple Podcasts asks for 1400–3000 px square artwork.

type Cover = { topic: string; icon: string | null; color: string | null };

/**
 * Podcast artwork, drawn on demand from the briefing's cover choice:
 *   /feed/{token}/art/cover.png        channel artwork (the whole feed)
 *   /feed/{token}/art/{briefingId}.png episode artwork for one briefing
 * The token must own the briefing, so artwork never reveals another user's topics.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string; file: string }> },
) {
  const { token, file } = await ctx.params;
  const id = file.replace(/\.png$/, "");

  let cover: Cover = {
    topic: "Your daily briefings",
    icon: "podcast",
    color: "blue",
  };
  if (id !== "cover") {
    const res = await publicBackendFetch(
      `/public/feed/${encodeURIComponent(token)}/briefings/${encodeURIComponent(id)}`,
    );
    if (!res.ok) return new Response("Not found", { status: 404 });
    cover = (await res.json()) as Cover;
  }

  const chosen = resolveCover(cover.topic, cover.icon, cover.color);
  const { Icon } = COVER_ICONS[chosen.icon];
  const background = COVER_COLORS[chosen.color];
  const ink = chosen.color === "yellow" ? "#1d1d1f" : "#ffffff";
  // The built-in OG font covers Latin script only; other scripts would render as boxes.
  const latin = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}$₹€£&+]*$/u.test(
    cover.topic,
  );
  const text = latin ? cover.topic : "Your daily briefing";
  const title = text.length > 70 ? `${text.slice(0, 68)}…` : text;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 120,
        background,
        color: ink,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 360,
          height: 360,
          borderRadius: 84,
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.18)",
        }}
      >
        <Icon size={220} color={ink} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 48, opacity: 0.8 }}>
          Briefcast · daily briefing
        </div>
      </div>
    </div>,
    {
      width: SIZE,
      height: SIZE,
      headers: {
        "cache-control": "public, max-age=3600",
        "x-robots-tag": "noindex",
      },
    },
  );
}

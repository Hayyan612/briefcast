import Script from "next/script";

const SRC = process.env.NEXT_PUBLIC_UMAMI_SRC;
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
/** Only count the live domain, so local testing stays out of the stats. */
const DOMAINS =
  process.env.NEXT_PUBLIC_UMAMI_DOMAINS || "briefcast.hayyan.space";

/** Self-hosted Umami (cookieless). Renders nothing unless both build settings are set. */
export function UmamiAnalytics() {
  if (!SRC || !WEBSITE_ID) return null;
  return (
    <Script
      src={SRC}
      data-website-id={WEBSITE_ID}
      data-domains={DOMAINS}
      strategy="afterInteractive"
    />
  );
}

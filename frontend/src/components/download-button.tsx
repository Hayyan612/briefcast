"use client";

import { DownloadIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";

/** Saves the episode MP3 (the API answers with Content-Disposition: attachment). */
export function DownloadButton({ episodeId }: { episodeId: string }) {
  return (
    <a
      href={`/api/backend/episodes/${episodeId}/audio?download=1`}
      download
      className={buttonVariants({ variant: "outline", size: "lg" })}
    >
      <DownloadIcon data-icon="inline-start" />
      Download MP3
    </a>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  RotateCcwIcon,
} from "@/components/icons";
import { notify as toast } from "@/lib/notify";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import type { EpisodeSummary } from "@/lib/types";

export function EpisodeRowActions({ episode }: { episode: EpisodeSummary }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Episode options" />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/episodes/${episode.id}`} />}>
          <ExternalLinkIcon />
          Open episode
        </DropdownMenuItem>
        {episode.status === "ready" ? (
          <DropdownMenuItem
            render={
              <a
                href={`/api/backend/episodes/${episode.id}/audio?download=1`}
                download
              />
            }
          >
            <DownloadIcon />
            Download MP3
          </DropdownMenuItem>
        ) : null}
        {episode.status === "failed" ? (
          <DropdownMenuItem
            onClick={async () => {
              try {
                await api(`/episodes/${episode.id}/retry`, { method: "POST" });
                toast.success("Retrying the episode");
                router.refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <RotateCcwIcon />
            Retry
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

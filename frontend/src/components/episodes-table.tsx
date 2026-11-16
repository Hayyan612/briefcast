import { LocalTime } from "@/components/local-time";
import type React from "react";
import Link from "next/link";
import { CircleAlertIcon } from "@/components/icons";

import { CoverArt } from "@/components/cover-art";
import { EpisodeRowActions } from "@/components/episode-row-actions";
import { ListenedBar } from "@/components/listened-bar";
import { PlayButton } from "@/components/player/play-button";
import { StatusBadge } from "@/components/status-badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/format";
import { IN_PROGRESS, type EpisodeSummary } from "@/lib/types";

export function EpisodesTable({ episodes }: { episodes: EpisodeSummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12" />
          <TableHead>Episode</TableHead>
          <TableHead className="hidden lg:table-cell">Date</TableHead>
          <TableHead className="hidden sm:table-cell">Length</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {episodes.map((ep, i) => {
          const title = ep.title ?? ep.topic;
          return (
            <TableRow
              key={ep.id}
              className="group rise h-14 transition-colors"
              style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
            >
              <TableCell>
                {ep.status === "ready" ? (
                  <PlayButton
                    size="icon-lg"
                    className="rounded-full"
                    track={{
                      id: ep.id,
                      title,
                      topic: ep.topic,
                      icon: ep.icon,
                      color: ep.color,
                    }}
                  />
                ) : IN_PROGRESS.includes(ep.status) ? (
                  <Spinner className="mx-auto text-mac-accent" />
                ) : (
                  <CircleAlertIcon className="mx-auto size-4 text-mac-red" />
                )}
              </TableCell>
              <TableCell className="max-w-0 w-full">
                <Link
                  href={`/episodes/${ep.id}`}
                  className="flex min-w-0 items-center gap-3.5 py-2"
                >
                  <CoverArt
                    topic={ep.topic}
                    icon={ep.icon}
                    color={ep.color}
                    className="size-9 rounded-[9px]"
                  />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="font-semibold group-hover:text-mac-accent max-md:line-clamp-2 max-md:whitespace-normal md:truncate">
                      {title}
                    </span>
                    <span className="truncate text-mac-callout text-mac-label-secondary">
                      {ep.topic} ·{" "}
                      {ep.trigger === "manual" ? "On demand" : "Scheduled"}
                    </span>
                    <ListenedBar episodeId={ep.id} />
                  </span>
                </Link>
              </TableCell>
              <TableCell className="hidden text-mac-label-secondary lg:table-cell">
                <LocalTime iso={ep.created_at} />
              </TableCell>
              <TableCell className="hidden text-mac-label-secondary tabular-nums sm:table-cell">
                {formatDuration(ep.duration_seconds)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <StatusBadge status={ep.status} />
              </TableCell>
              <TableCell>
                <EpisodeRowActions episode={ep} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

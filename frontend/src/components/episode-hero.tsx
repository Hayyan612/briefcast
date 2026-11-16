import Link from "next/link";
import { BookOpenIcon, ClockIcon, FileTextIcon } from "@/components/icons";

import { CoverArt } from "@/components/cover-art";
import { PlayButton } from "@/components/player/play-button";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import type { EpisodeSummary } from "@/lib/types";

/** Large "now showing" card for the newest ready episode, after the design's hero banner. */
export function EpisodeHero({
  episode,
  eyebrow = "Latest episode",
  sources,
  showOpen = true,
}: {
  episode: EpisodeSummary;
  eyebrow?: string;
  sources?: number;
  showOpen?: boolean;
}) {
  const title = episode.title ?? episode.topic;
  return (
    <Card className="rise py-0">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center md:p-8">
        <CoverArt
          topic={episode.topic}
          className="size-20 shrink-0 text-2xl sm:size-28 sm:text-3xl md:size-32 md:text-4xl"
        />
        <div className="grid min-w-0 gap-3">
          <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </span>
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
            {title}
          </h1>
          <p className="line-clamp-2 text-foreground/70">{episode.topic}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <ClockIcon data-icon="inline-start" />
              {formatDuration(episode.duration_seconds)}
            </Badge>
            {sources !== undefined ? (
              <Badge variant="outline">
                <BookOpenIcon data-icon="inline-start" />
                {sources} {sources === 1 ? "source" : "sources"}
              </Badge>
            ) : null}
            <Badge variant="outline">
              <LocalTime iso={episode.scheduled_for} />
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <PlayButton
              size="lg"
              label="Play episode"
              className="h-11 rounded-full px-6"
              track={{ id: episode.id, title, topic: episode.topic }}
            />
            {showOpen ? (
              <Link
                href={`/episodes/${episode.id}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-11 rounded-full px-5",
                })}
              >
                <FileTextIcon data-icon="inline-start" />
                Script and sources
              </Link>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { LinkButton } from "@/components/link-button";
import { BookOpenIcon, ClockIcon, FileTextIcon } from "@/components/icons";

import { CoverArt } from "@/components/cover-art";
import { DownloadButton } from "@/components/download-button";
import { PlayButton } from "@/components/player/play-button";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
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
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center md:gap-8 md:p-8">
        <CoverArt
          topic={episode.topic}
          className="size-20 rounded-[18px] md:size-24 md:rounded-[22px]"
        />
        <div className="grid min-w-0 gap-2.5">
          <span className="text-mac-subheadline font-semibold text-mac-label-secondary">
            {eyebrow}
          </span>
          <h1 className="text-mac-title-1 font-bold text-balance">{title}</h1>
          <p className="line-clamp-2 text-mac-body text-mac-label-secondary">
            {episode.topic}
          </p>
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
          <div className="mt-2 flex flex-wrap gap-2.5">
            <PlayButton
              size="lg"
              label="Play episode"
              track={{ id: episode.id, title, topic: episode.topic }}
            />
            {showOpen ? (
              <LinkButton
                href={`/episodes/${episode.id}`}
                variant="outline"
                size="lg"
              >
                <FileTextIcon data-icon="inline-start" />
                Script and sources
              </LinkButton>
            ) : (
              <DownloadButton episodeId={episode.id} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

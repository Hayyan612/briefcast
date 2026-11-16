import Link from "next/link";
import { ChevronRightIcon, HeadphonesIcon } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { EpisodeSummary } from "@/lib/types";

export function EpisodeList({ episodes }: { episodes: EpisodeSummary[] }) {
  return (
    <ItemGroup className="gap-2">
      {episodes.map((ep) => (
        <Item
          key={ep.id}
          variant="outline"
          render={<Link href={`/episodes/${ep.id}`} />}
        >
          <ItemMedia variant="icon">
            <HeadphonesIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{ep.title ?? ep.topic}</ItemTitle>
            <ItemDescription>
              {formatDateTime(ep.created_at)} ·{" "}
              {ep.trigger === "manual" ? "Run now" : "Scheduled"}
              {ep.duration_seconds
                ? ` · ${formatDuration(ep.duration_seconds)}`
                : ""}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <StatusBadge status={ep.status} />
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}

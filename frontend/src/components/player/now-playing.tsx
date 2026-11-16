"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { CoverArt } from "@/components/cover-art";
import {
  ExpandIcon,
  Rewind15BackIcon,
  Rewind15ForwardIcon,
} from "@/components/icons";
import { PlayPauseGlyph } from "@/components/player/play-button";
import { usePlayer } from "@/components/player/player-provider";
import { Transcript } from "@/components/transcript";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { EpisodeDetail } from "@/lib/types";

function clock(seconds: number) {
  return formatDuration(Math.floor(seconds) || 0).replace("—", "0:00");
}

/** Spotify-style full view: big cover and controls beside the live transcript. */
export function NowPlaying() {
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<EpisodeDetail | null>(null);
  const trackId = p.track?.id;

  useEffect(() => {
    if (!open || !trackId || detail?.id === trackId) return;
    let cancelled = false;
    api<EpisodeDetail>(`/episodes/${trackId}`)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, trackId, detail?.id]);

  if (!p.track) return null;
  const track = p.track;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Open Now Playing with transcript"
          />
        }
      >
        <ExpandIcon />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[92svh] gap-0 overflow-hidden rounded-t-2xl p-0 sm:max-w-none"
      >
        <div className="grid h-full min-h-0 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section className="flex flex-col gap-6 border-b p-6 md:border-r md:border-b-0 md:p-10">
            <CoverArt
              topic={track.topic}
              icon={track.icon}
              color={track.color}
              className="size-40 rounded-[36px] [&_svg]:size-[50%]! max-md:mx-auto md:size-64 md:rounded-[56px]"
            />
            <div className="grid gap-1 max-md:text-center">
              <SheetTitle className="text-mac-title-2 font-bold text-balance">
                {track.title}
              </SheetTitle>
              <SheetDescription>{track.topic}</SheetDescription>
            </div>
            <div className="grid gap-2">
              <Slider
                aria-label="Seek"
                value={[p.time]}
                max={p.duration || 1}
                step={1}
                onValueChange={(v) => p.seek(Array.isArray(v) ? v[0] : v)}
              />
              <div className="flex justify-between text-mac-footnote text-muted-foreground tabular-nums">
                <span>{clock(p.time)}</span>
                <span>-{clock(Math.max(p.duration - p.time, 0))}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label="Back 15 seconds"
                onClick={() => p.skip(-15)}
              >
                <Rewind15BackIcon />
              </Button>
              <Button
                size="icon-xl"
                className="size-16 rounded-full [&_svg]:size-7!"
                aria-label={p.playing ? "Pause" : "Play"}
                onClick={p.toggle}
              >
                <PlayPauseGlyph playing={p.playing} />
              </Button>
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label="Forward 15 seconds"
                onClick={() => p.skip(15)}
              >
                <Rewind15ForwardIcon />
              </Button>
            </div>
            <Link
              href={`/episodes/${track.id}`}
              onClick={() => setOpen(false)}
              className="mt-auto text-center text-mac-callout text-mac-link hover:underline max-md:hidden"
            >
              Sources and agent log
            </Link>
          </section>
          <section
            data-transcript-scroll
            className="min-h-0 overflow-y-auto px-6 py-8 md:px-12 md:py-12"
          >
            <h3 className="mb-6 text-mac-headline font-semibold text-muted-foreground">
              Transcript
            </h3>
            {detail?.id === track.id && detail.transcript?.length ? (
              <Transcript
                track={track}
                lines={detail.transcript}
                className="max-w-[60ch]"
              />
            ) : (
              <div className="mx-auto grid max-w-[60ch] gap-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton
                    key={i}
                    className="h-5"
                    style={{ width: `${70 + ((i * 37) % 30)}%` }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

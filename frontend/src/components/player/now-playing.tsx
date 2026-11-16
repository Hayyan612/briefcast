"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { CoverArt } from "@/components/cover-art";
import {
  ChevronDownIcon,
  ExpandIcon,
  Rewind15BackIcon,
  Rewind15ForwardIcon,
} from "@/components/icons";
import { PlayPauseGlyph } from "@/components/player/play-button";
import { usePlayer } from "@/components/player/player-provider";
import { OPEN_EVENT } from "@/components/player/now-playing-event";
import { Transcript } from "@/components/transcript";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
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

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
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
        showCloseButton={false}
        className="flex h-[94svh] flex-col gap-0 overflow-hidden rounded-t-mac-window p-0 sm:max-w-none"
      >
        <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-mac-separator px-4 md:px-6">
          <span
            aria-hidden
            className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-mac-fill-primary"
          />
          <span className="text-mac-headline font-semibold text-mac-label-secondary">
            Now Playing
          </span>
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close Now Playing"
              />
            }
          >
            <ChevronDownIcon />
          </SheetClose>
        </header>
        <div className="grid min-h-0 flex-1 max-md:grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* Phones: the transcript gets the screen and the player sits under it as a compact strip. */}
          <section className="flex flex-col gap-3 border-t border-mac-separator p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-md:order-last md:gap-6 md:border-t-0 md:border-r md:p-10">
            <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-6">
              <CoverArt
                topic={track.topic}
                icon={track.icon}
                color={track.color}
                className="size-12 shrink-0 rounded-[12px] [&_svg]:size-[50%]! md:size-64 md:rounded-[56px]"
              />
              <div className="grid min-w-0 gap-0.5 md:gap-1">
                <SheetTitle className="line-clamp-2 text-mac-headline font-bold md:text-mac-title-2 md:text-balance">
                  {track.title}
                </SheetTitle>
                <SheetDescription className="truncate max-md:text-mac-callout">
                  {track.topic}
                </SheetDescription>
              </div>
            </div>
            <div className="grid gap-2">
              <Slider
                aria-label="Seek"
                value={[p.time]}
                max={p.duration || 1}
                step={1}
                onValueChange={(v) => p.seek(Array.isArray(v) ? v[0] : v)}
              />
              <div className="flex justify-between text-mac-footnote text-mac-label-secondary tabular-nums">
                <span>{clock(p.time)}</span>
                <span>-{clock(Math.max(p.duration - p.time, 0))}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 md:gap-6">
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
                className="size-12 rounded-full [&_svg]:size-6! md:size-16 md:[&_svg]:size-7!"
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
          <section className="min-h-0 p-2 md:p-6">
            {detail?.id === track.id && detail.transcript?.length ? (
              <Transcript
                track={track}
                lines={detail.transcript}
                variant="full"
              />
            ) : (
              <div className="grid h-full content-center gap-4 rounded-mac-group bg-mac-fill-quaternary px-8">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton
                    key={i}
                    className="h-7"
                    style={{ width: `${60 + ((i * 37) % 35)}%` }}
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

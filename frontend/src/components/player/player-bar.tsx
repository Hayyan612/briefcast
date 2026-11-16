"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  GaugeIcon,
  Rewind15BackIcon,
  Rewind15ForwardIcon,
  Volume2Icon,
  VolumeXIcon,
} from "@/components/icons";

import { CoverArt } from "@/components/cover-art";
import { NowPlaying, openNowPlaying } from "@/components/player/now-playing";
import { useLiveTranscript } from "@/components/player/use-live-transcript";
import { PlayPauseGlyph } from "@/components/player/play-button";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/format";

const RATES = [0.85, 1, 1.15, 1.25, 1.5];

function clock(seconds: number): string {
  return formatDuration(Math.floor(seconds) || 0).replace("—", "0:00");
}

export function PlayerBar() {
  const p = usePlayer();
  return (
    <AnimatePresence>
      {p.track ? <PlayerBarInner key="player" /> : null}
    </AnimatePresence>
  );
}

function PlayerBarInner() {
  const p = usePlayer();
  if (!p.track) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      role="region"
      aria-label="Audio player"
      className="overflow-hidden border-t bg-mac-window/95 backdrop-blur"
    >
      <div className="mx-auto grid h-[72px] max-w-screen-2xl grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={openNowPlaying}
          aria-label={`Open Now Playing: ${p.track.title}`}
          className="flex min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-mac-accent"
        >
          <CoverArt
            topic={p.track.topic}
            icon={p.track.icon}
            color={p.track.color}
            className="size-12"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{p.track.title}</p>
            <LiveCaption fallback={p.track.topic} />
          </div>
        </button>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Back 15 seconds"
                  />
                }
                onClick={() => p.skip(-15)}
              >
                <Rewind15BackIcon />
              </TooltipTrigger>
              <TooltipContent>Back 15s</TooltipContent>
            </Tooltip>
            <Button
              size="icon-lg"
              className="rounded-full"
              aria-label={p.playing ? "Pause" : "Play"}
              onClick={p.toggle}
            >
              <PlayPauseGlyph playing={p.playing} />
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Forward 15 seconds"
                  />
                }
                onClick={() => p.skip(15)}
              >
                <Rewind15ForwardIcon />
              </TooltipTrigger>
              <TooltipContent>Forward 15s</TooltipContent>
            </Tooltip>
            <NowPlaying />
          </div>
          <div className="hidden w-full items-center gap-3 text-xs text-muted-foreground tabular-nums md:flex">
            <span className="w-10 text-right">{clock(p.time)}</span>
            <Slider
              aria-label="Seek"
              value={[p.time]}
              max={p.duration || 1}
              step={1}
              onValueChange={(v) => p.seek(Array.isArray(v) ? v[0] : v)}
            />
            <span className="w-10">{clock(p.duration)}</span>
          </div>
        </div>

        <div className="hidden items-center justify-end gap-2 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" aria-label="Playback speed" />}
            >
              <GaugeIcon data-icon="inline-start" />
              {p.rate}×
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Speed</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={String(p.rate)}
                  onValueChange={(v) => p.setRate(Number(v))}
                >
                  {RATES.map((r) => (
                    <DropdownMenuRadioItem key={r} value={String(r)}>
                      {r}×
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={p.volume ? "Mute" : "Unmute"}
            onClick={() => p.setVolume(p.volume ? 0 : 1)}
          >
            {p.volume ? <Volume2Icon /> : <VolumeXIcon />}
          </Button>
          <div className="w-24">
            <Slider
              aria-label="Volume"
              value={[p.volume * 100]}
              max={100}
              onValueChange={(v) =>
                p.setVolume((Array.isArray(v) ? v[0] : v) / 100)
              }
            />
          </div>
        </div>
      </div>
      {/* Thin progress line on phones, where the seek bar is hidden. */}
      <div className="h-0.5 bg-muted md:hidden">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-linear"
          style={{ width: `${p.duration ? (p.time / p.duration) * 100 : 0}%` }}
        />
      </div>
    </motion.div>
  );
}

/** The sentence being spoken right now, as a one-line live caption. */
function LiveCaption({ fallback }: { fallback: string }) {
  const { lines, index } = useLiveTranscript();
  const line = lines && index >= 0 ? lines[index] : null;
  return (
    <div className="relative h-4 overflow-hidden" aria-live="off">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.p
          key={line ? `${index}` : "topic"}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="truncate text-xs text-muted-foreground"
        >
          {line ? line.text : fallback}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

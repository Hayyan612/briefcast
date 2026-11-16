"use client";

import { useEffect, useState } from "react";

import { usePlayer } from "@/components/player/player-provider";
import type { TranscriptLine } from "@/lib/types";

// Light up a line a moment before it starts, so the eye arrives with the voice.
const LEAD_SECONDS = 0.12;

export function lineAt(lines: TranscriptLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/**
 * Index of the line being spoken. While playing it reads the audio clock every animation
 * frame (the media `timeupdate` event only fires about 4×/s), but re-renders only when
 * the line actually changes.
 */
export function usePlaybackIndex(
  lines: TranscriptLine[] | null,
  trackId: string | null,
): number {
  const player = usePlayer();
  const { getTime, playing, time } = player;
  const isCurrent = !!trackId && player.track?.id === trackId;
  const [index, setIndex] = useState(-1);

  // Paused or seeking: follow the coarse clock.
  const coarse =
    isCurrent && lines?.length ? lineAt(lines, time + LEAD_SECONDS) : -1;

  useEffect(() => {
    if (!isCurrent || !playing || !lines?.length) return;
    let raf = 0;
    let last = -2;
    const tick = () => {
      const i = lineAt(lines, getTime() + LEAD_SECONDS);
      if (i !== last) {
        last = i;
        setIndex(i);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isCurrent, playing, getTime, lines]);

  return isCurrent && playing ? index : coarse;
}

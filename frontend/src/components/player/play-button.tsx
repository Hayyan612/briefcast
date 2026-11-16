"use client";

import { PauseIcon, PlayIcon } from "@/components/icons";

import {
  usePlayer,
  type PlayerTrack,
} from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";

/** Plays an episode in the global player, or pauses it if it is the one playing. */
export function PlayButton({
  track,
  size = "icon",
  label,
  className,
}: {
  track: PlayerTrack;
  size?: "icon" | "icon-sm" | "icon-lg" | "lg" | "default";
  label?: string;
  className?: string;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  const isPlaying = isCurrent && player.playing;
  return (
    <Button
      size={size}
      className={className}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      onClick={() => (isCurrent ? player.toggle() : player.play(track))}
    >
      {isPlaying ? (
        <PauseIcon data-icon={label ? "inline-start" : undefined} />
      ) : (
        <PlayIcon data-icon={label ? "inline-start" : undefined} />
      )}
      {label ? (isPlaying ? "Pause" : label) : null}
    </Button>
  );
}

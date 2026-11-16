"use client";

import { AnimatePresence, motion } from "motion/react";

import { PauseIcon, PlayIcon } from "@/components/icons";
import { usePlayer, type PlayerTrack } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";

/** Morphing play/pause glyph shared by every play control. */
export function PlayPauseGlyph({ playing }: { playing: boolean }) {
  return (
    <span className="relative inline-flex size-[1em] items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={playing ? "pause" : "play"}
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0, rotate: 30 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
          className="inline-flex"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Plays an episode in the global player, or pauses it if it is the one playing. */
export function PlayButton({
  track,
  size = "icon",
  label,
  className,
}: {
  track: PlayerTrack;
  size?: "icon" | "icon-lg" | "icon-xl" | "lg" | "xl" | "default";
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
      aria-pressed={isPlaying}
      onClick={() => (isCurrent ? player.toggle() : player.play(track))}
    >
      <PlayPauseGlyph playing={isPlaying} />
      {label ? <span>{isPlaying ? "Pause" : label}</span> : null}
    </Button>
  );
}

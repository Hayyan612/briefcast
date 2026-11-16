"use client";

import { AnimatePresence, motion } from "motion/react";

import { CoverArt } from "@/components/cover-art";
import { TranscriptIcon } from "@/components/icons";
import { openNowPlaying } from "@/components/player/now-playing";
import { PlayButton } from "@/components/player/play-button";
import { usePlayer } from "@/components/player/player-provider";
import { useLiveTranscript } from "@/components/player/use-live-transcript";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Home-screen "Now playing" card: the last, current and next transcript lines, live. */
export function LiveTranscriptCard() {
  const { track } = usePlayer();
  const { lines, index } = useLiveTranscript();
  if (!track) return null;

  const window3 = lines?.length
    ? [index - 1, Math.max(index, 0), Math.max(index, 0) + 1].map((i) =>
        i >= 0 && i < lines.length ? { i, line: lines[i] } : null,
      )
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="py-0">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-6 md:p-6">
          <div className="flex items-center gap-4">
            <CoverArt
              topic={track.topic}
              icon={track.icon}
              color={track.color}
              className="size-14 rounded-[13px]"
            />
            <div className="grid min-w-0 gap-0.5 md:hidden">
              <span className="text-mac-footnote font-semibold text-mac-accent">
                Now playing
              </span>
              <span className="truncate font-semibold">{track.title}</span>
            </div>
          </div>
          <div className="grid min-w-0 gap-1">
            <span className="text-mac-footnote font-semibold text-mac-accent max-md:hidden">
              Now playing · {track.title}
            </span>
            <div className="relative grid gap-1" aria-live="off">
              <AnimatePresence initial={false} mode="popLayout">
                {window3.map((slot, pos) =>
                  slot ? (
                    <motion.p
                      key={slot.i}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "line-clamp-2 text-mac-body",
                        pos === 1 && index >= 0
                          ? "text-[17px] leading-6 font-semibold text-mac-label"
                          : "text-mac-label-secondary",
                      )}
                    >
                      {slot.line.text}
                    </motion.p>
                  ) : (
                    <span key={`empty-${pos}`} className="h-5" />
                  ),
                )}
              </AnimatePresence>
              {!lines ? (
                <p className="text-mac-label-secondary">Loading transcript…</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 md:flex-col md:items-stretch">
            <PlayButton track={track} size="lg" label="Play" />
            <Button variant="outline" size="lg" onClick={openNowPlaying}>
              <TranscriptIcon data-icon="inline-start" />
              Full transcript
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

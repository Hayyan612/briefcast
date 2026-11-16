"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { ArrowDownIcon } from "@/components/icons";
import {
  usePlayer,
  type PlayerTrack,
} from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TranscriptLine } from "@/lib/types";

function clock(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Spotify-style synced transcript. The line being spoken is highlighted and kept in
 * view; tapping a line plays from there. Following pauses while the listener scrolls.
 */
export function Transcript({
  track,
  lines,
  className,
}: {
  track: PlayerTrack;
  lines: TranscriptLine[];
  className?: string;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  const time = isCurrent ? player.time : -1;
  const active = useMemo(() => {
    if (time < 0) return -1;
    let lo = 0;
    let hi = lines.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].start <= time) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found;
  }, [lines, time]);

  const container = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [following, setFollowing] = useState(true);
  const programmatic = useRef(false);

  // Keep the active line in view while following.
  useEffect(() => {
    if (!following || active < 0 || !isCurrent || !player.playing) return;
    const el = lineRefs.current[active];
    if (!el) return;
    programmatic.current = true;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => (programmatic.current = false), 700);
    return () => clearTimeout(t);
  }, [active, following, isCurrent, player.playing]);

  // A manual scroll pauses following.
  useEffect(() => {
    const scroller = container.current?.closest(
      "[data-slot=window-content], [data-transcript-scroll]",
    );
    if (!scroller) return;
    const onScroll = () => {
      if (!programmatic.current) setFollowing(false);
    };
    scroller.addEventListener("wheel", onScroll, { passive: true });
    scroller.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("wheel", onScroll);
      scroller.removeEventListener("touchmove", onScroll);
    };
  }, []);

  const paragraphs = useMemo(() => {
    const groups: {
      p: number;
      items: { line: TranscriptLine; i: number }[];
    }[] = [];
    lines.forEach((line, i) => {
      const last = groups.at(-1);
      if (last && last.p === line.p) last.items.push({ line, i });
      else groups.push({ p: line.p, items: [{ line, i }] });
    });
    return groups;
  }, [lines]);

  return (
    <div ref={container} className={cn("relative", className)}>
      <div className="grid gap-6">
        {paragraphs.map((group) => (
          <p
            key={group.p}
            className="text-[17px] leading-8 md:text-lg md:leading-9"
          >
            {group.items.map(({ line, i }) => {
              const state = i === active ? "now" : i < active ? "past" : "next";
              return (
                <button
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => {
                    setFollowing(true);
                    player.play(track, line.start);
                  }}
                  aria-current={state === "now" ? "true" : undefined}
                  aria-label={`Play from ${clock(line.start)}: ${line.text}`}
                  className={cn(
                    "inline rounded-md px-0.5 text-left transition-[color,background-color] duration-300 [box-decoration-break:clone] hover:bg-mac-fill-tertiary focus-visible:outline-2 focus-visible:outline-mac-accent",
                    state === "now" &&
                      "bg-mac-accent/12 font-semibold text-mac-label",
                    state === "past" && "text-mac-label-secondary",
                    state === "next" && "text-mac-label",
                  )}
                >
                  {line.text}{" "}
                </button>
              );
            })}
          </p>
        ))}
      </div>

      <AnimatePresence>
        {isCurrent && !following && active >= 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none sticky bottom-4 flex justify-center"
          >
            <Button
              size="lg"
              className="pointer-events-auto shadow-mac-popover"
              onClick={() => {
                setFollowing(true);
                lineRefs.current[active]?.scrollIntoView({
                  block: "center",
                  behavior: "smooth",
                });
              }}
            >
              <ArrowDownIcon data-icon="inline-start" />
              Back to current line
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

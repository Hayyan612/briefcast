"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { ArrowDownIcon } from "@/components/icons";
import {
  usePlayer,
  type PlayerTrack,
} from "@/components/player/player-provider";
import { usePlaybackIndex } from "@/components/player/use-playback-index";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TranscriptLine } from "@/lib/types";

const SCROLL_MS = 280;

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
  }
  return null;
}

/** Centre `el` in its scroll container with a short ease-out (snappier than native smooth). */
function centerLine(el: HTMLElement) {
  const box = scrollParent(el);
  if (!box) return;
  const boxRect = box.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const target =
    box.scrollTop +
    (elRect.top - boxRect.top) -
    (box.clientHeight / 2 - elRect.height / 2);
  const from = box.scrollTop;
  const delta =
    Math.max(0, Math.min(target, box.scrollHeight - box.clientHeight)) - from;
  if (Math.abs(delta) < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    box.scrollTop = from + delta;
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min((now - t0) / SCROLL_MS, 1);
    box.scrollTop = from + delta * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

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
  const active = usePlaybackIndex(lines, track.id);

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
    centerLine(el);
    const t = setTimeout(() => (programmatic.current = false), SCROLL_MS + 80);
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
      {!isCurrent ? (
        <p className="mb-5 text-mac-footnote text-muted-foreground">
          Tap any line to play from there.
        </p>
      ) : null}
      <div className="grid gap-7">
        {paragraphs.map((group) => {
          const first = group.items[0].line;
          const groupActive = group.items.some(({ i }) => i === active);
          return (
            <div
              key={group.p}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3"
            >
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => {
                  setFollowing(true);
                  player.play(track, first.start);
                }}
                className={cn(
                  "mt-1.5 h-fit text-left text-mac-footnote tabular-nums transition-colors duration-300 hover:text-mac-accent",
                  groupActive
                    ? "font-semibold text-mac-accent"
                    : "text-muted-foreground",
                )}
              >
                {clock(first.start)}
              </button>
              <p className="text-[17px] leading-8 md:text-lg md:leading-9">
                {group.items
                  .map(({ line, i }) => {
                    const state =
                      i === active ? "now" : i < active ? "past" : "next";
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
                        data-start={line.start}
                      aria-current={state === "now" ? "true" : undefined}
                        aria-label={`Play from ${clock(line.start)}: ${line.text}`}
                        className={cn(
                          // Colour only: changing weight would re-wrap lines as the highlight moves.
                          "inline scroll-my-24 rounded-[5px] px-[3px] text-left [box-decoration-break:clone] transition-[color,background-color] duration-300 hover:bg-mac-fill-tertiary focus-visible:outline-2 focus-visible:outline-mac-accent",
                          state === "now" && "bg-mac-accent/12 text-mac-label",
                          state === "past" && "text-mac-label-secondary",
                          state === "next" && "text-mac-label",
                        )}
                      >
                        {line.text}
                      </button>
                    );
                  })
                  .flatMap((el, k) => (k === 0 ? [el] : [" ", el]))}
              </p>
            </div>
          );
        })}
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
                const el = lineRefs.current[active];
                if (el) centerLine(el);
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

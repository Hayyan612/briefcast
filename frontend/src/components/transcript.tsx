"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { ArrowDownIcon, ExpandIcon } from "@/components/icons";
import { openNowPlaying } from "@/components/player/now-playing-event";
import {
  usePlayer,
  type PlayerTrack,
} from "@/components/player/player-provider";
import { usePlaybackIndex } from "@/components/player/use-playback-index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
 * Lyrics-style transcript (as in Spotify and Apple Music): large bold lines, the spoken
 * line in the primary label colour and kept centred, the rest in secondary. It scrolls inside its own
 * panel, so a long transcript never stretches the page. Tapping a line plays from it.
 */
export function Transcript({
  track,
  lines,
  variant = "card",
  className,
}: {
  track: PlayerTrack;
  lines: TranscriptLine[];
  /** "card": fixed-height panel on a page. "full": fills its parent (Now Playing). */
  variant?: "card" | "full";
  className?: string;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  const active = usePlaybackIndex(lines, track.id);

  const scroller = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [following, setFollowing] = useState(true);
  const programmatic = useRef(false);

  // Keep the spoken line centred while following.
  useEffect(() => {
    if (!following || active < 0 || !isCurrent) return;
    const el = lineRefs.current[active];
    if (!el) return;
    programmatic.current = true;
    centerLine(el);
    const t = setTimeout(() => (programmatic.current = false), SCROLL_MS + 80);
    return () => clearTimeout(t);
  }, [active, following, isCurrent]);

  // A manual scroll pauses following until "Back to current line".
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      if (!programmatic.current) setFollowing(false);
    };
    el.addEventListener("wheel", onScroll, { passive: true });
    el.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onScroll);
      el.removeEventListener("touchmove", onScroll);
    };
  }, []);

  const playFrom = (start: number) => {
    setFollowing(true);
    player.play(track, start);
  };

  return (
    <Card
      role="region"
      aria-label="Transcript"
      className={cn(
        "relative gap-0 overflow-hidden py-0",
        variant === "card" ? "h-[min(30rem,62vh)]" : "h-full",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-1 md:px-8">
        <h2 className="text-mac-headline font-semibold text-mac-label-secondary">
          Transcript
        </h2>
        <div className="flex items-center gap-2">
          {!isCurrent ? (
            <span className="text-mac-footnote text-mac-label-secondary max-sm:hidden">
              Tap a line to play from there
            </span>
          ) : null}
          {variant === "card" ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open in Now Playing"
              onClick={() => {
                if (!isCurrent) player.play(track);
                openNowPlaying();
              }}
            >
              <ExpandIcon />
            </Button>
          ) : null}
        </div>
      </header>

      <div
        ref={scroller}
        tabIndex={-1}
        className="lyrics-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 md:px-8"
      >
        <ol className="grid gap-3 pt-4 pb-[45%] md:gap-4">
          {lines.map((line, i) => {
            const state = i === active ? "now" : i < active ? "past" : "next";
            const paragraphStart = i > 0 && lines[i - 1].p !== line.p;
            return (
              <li key={i} className={cn(paragraphStart && "mt-5 md:mt-7")}>
                <button
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  type="button"
                  data-start={line.start}
                  aria-current={state === "now" ? "true" : undefined}
                  aria-label={`Play from ${clock(line.start)}: ${line.text}`}
                  onClick={() => playFrom(line.start)}
                  className={cn(
                    "relative isolate block w-full origin-left text-left text-[22px] leading-[1.28] font-bold tracking-[-0.015em] text-balance transition-[color,opacity,transform] duration-300 ease-out md:text-[28px]",
                    "rounded-mac-item outline-offset-4 hover:text-mac-label focus-visible:outline-2 focus-visible:outline-mac-accent",
                    // macOS label colours: the spoken line in primary, the rest in secondary.
                    !isCurrent || state === "now"
                      ? "text-mac-label"
                      : "text-mac-label-secondary",
                  )}
                >
                  {isCurrent && state === "now" ? (
                    <motion.span
                      aria-hidden
                      layoutId={`transcript-highlight-${variant}`}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 38,
                      }}
                      className="absolute -inset-x-3 -inset-y-1.5 -z-10 rounded-mac-item bg-mac-accent/10"
                    />
                  ) : null}
                  {line.text}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <AnimatePresence>
        {isCurrent && !following && active >= 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
          >
            <Button
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
    </Card>
  );
}

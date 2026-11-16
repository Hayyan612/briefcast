"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { CoverArt } from "@/components/cover-art";
import { PlayPauseGlyph } from "@/components/player/play-button";
import { lineAt } from "@/components/player/use-playback-index";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TranscriptLine } from "@/lib/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Sample {
  title: string;
  topic: string;
  duration: number;
  icon: string | null;
  color: string | null;
  transcript: TranscriptLine[];
}

// Two real episodes, exported with their audio-aligned transcripts.
const SAMPLES = {
  en: {
    label: "English",
    lang: "en",
    audio: "/sample/episode.mp3",
    data: "/sample/episode.json",
  },
  hi: {
    label: "हिन्दी",
    lang: "hi",
    audio: "/sample/episode-hi.mp3",
    data: "/sample/episode-hi.json",
  },
} as const;
type SampleKey = keyof typeof SAMPLES;

// Light a line up a moment early, as the app does, so the eye arrives with the voice.
const LEAD_SECONDS = 0.12;

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Glass player on the landing page: a real episode with its words following the voice. */
export function SamplePlayer({ className }: { className?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [key, setKey] = useState<SampleKey>("en");
  const [samples, setSamples] = useState<Partial<Record<SampleKey, Sample>>>(
    {},
  );
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [index, setIndex] = useState(-1);
  const sample = samples[key];

  useEffect(() => {
    if (samples[key]) return;
    let cancelled = false;
    fetch(SAMPLES[key].data)
      .then((r) =>
        r.ok ? (r.json() as Promise<Sample>) : Promise.reject(r.status),
      )
      .then(
        (data) =>
          !cancelled && setSamples((prev) => ({ ...prev, [key]: data })),
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, samples]);

  // Frame-accurate line tracking while playing; re-renders only when the line changes.
  useEffect(() => {
    const lines = sample?.transcript;
    if (!playing || !lines?.length) return;
    let raf = 0;
    const tick = () => {
      const el = audio.current;
      if (el) {
        setTime(el.currentTime);
        setIndex(lineAt(lines, el.currentTime + LEAD_SECONDS));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, sample]);

  function choose(next: SampleKey) {
    if (next === key) return;
    audio.current?.pause();
    setKey(next);
    setTime(0);
    setIndex(-1);
  }

  function toggle() {
    const el = audio.current;
    if (!el) return;
    // A blocked or failed start leaves the button showing Play rather than stuck.
    if (el.paused) {
      track("sample_play", { language: SAMPLES[key].lang });
      el.play().catch(() => setPlaying(false));
    } else el.pause();
  }

  const lines = sample?.transcript ?? [];
  const current = Math.max(index, 0);
  const slots = [current - 1, current, current + 1].map((i) =>
    i >= 0 && i < lines.length ? { i, text: lines[i].text } : null,
  );
  const duration = sample?.duration ?? 0;

  return (
    <section
      aria-label="Sample episode"
      className={cn(
        "grid gap-4 rounded-[22px] p-5 text-mac-label",
        "bg-white/70 shadow-[0_30px_80px_-24px_rgb(10_20_60/0.55),inset_0_1px_0_rgb(255_255_255/0.75)] ring-1 ring-black/5 backdrop-blur-2xl backdrop-saturate-150",
        "dark:bg-[#1e1f20]/70 dark:shadow-[0_30px_80px_-24px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.12)] dark:ring-white/10",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <CoverArt
          topic={sample?.topic ?? "Startup funding"}
          icon={sample?.icon}
          color={sample?.color}
          className="size-12 shrink-0 rounded-[12px]"
        />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-mac-callout font-semibold text-mac-accent">
            Sample episode
          </span>
          <span
            lang={SAMPLES[key].lang}
            className="line-clamp-2 text-mac-headline font-semibold"
          >
            {sample?.title ?? " "}
          </span>
        </div>
      </div>

      <ToggleGroup
        aria-label="Episode language"
        value={[key]}
        onValueChange={(v) => {
          const next = (v as string[])[0];
          if (next === "en" || next === "hi") choose(next);
        }}
        variant="outline"
        className="grid w-full grid-cols-2"
      >
        {(Object.keys(SAMPLES) as SampleKey[]).map((k) => (
          <ToggleGroupItem key={k} value={k} lang={SAMPLES[k].lang}>
            {SAMPLES[k].label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div
        lang={SAMPLES[key].lang}
        className="grid h-[8.75rem] content-center gap-1.5 overflow-hidden"
        aria-live="off"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {slots.map((slot, pos) =>
            slot ? (
              <motion.p
                key={`${key}-${slot.i}`}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  pos === 1
                    ? "line-clamp-3 text-mac-title-2 font-bold tracking-[-0.01em]"
                    : "truncate text-mac-callout text-mac-label-secondary",
                )}
              >
                {slot.text}
              </motion.p>
            ) : (
              <span key={`empty-${pos}`} className="h-4" />
            ),
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="icon-xl"
          className="size-11 shrink-0 rounded-full [&_svg]:size-5!"
          aria-label={playing ? "Pause sample" : "Play sample"}
          onClick={toggle}
          disabled={!sample}
        >
          <PlayPauseGlyph playing={playing} />
        </Button>
        <div className="grid min-w-0 flex-1 gap-1">
          <Slider
            aria-label="Seek"
            value={[time]}
            max={duration || 1}
            step={1}
            onValueChange={(v) => {
              const t = Array.isArray(v) ? v[0] : v;
              if (audio.current) audio.current.currentTime = t;
              setTime(t);
              if (sample) setIndex(lineAt(sample.transcript, t + LEAD_SECONDS));
            }}
          />
          <div className="flex justify-between text-mac-caption text-mac-label-secondary tabular-nums">
            <span>{clock(time)}</span>
            <span>-{clock(duration - time)}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audio}
        src={SAMPLES[key].audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        hidden
      />
    </section>
  );
}

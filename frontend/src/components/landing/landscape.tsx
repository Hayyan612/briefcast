"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/**
 * The landing page's wallpaper: one valley, painted for the visitor's own time of day.
 * Dawn, day and dusk in light mode; dark mode is always the night sky. Drawn as layered
 * ridges, so it costs no image download or licence.
 */

type Phase = "dawn" | "day" | "dusk" | "night";

const RIDGES = [
  "M0 560 C200 500 320 520 480 470 S760 430 920 480 S1200 520 1360 470 S1540 450 1600 470 V900 H0Z",
  "M0 620 C160 580 300 600 440 560 S700 520 860 580 S1120 640 1300 590 S1520 560 1600 590 V900 H0Z",
  "M0 700 C180 650 360 690 520 650 S820 610 980 670 S1260 720 1420 680 S1560 660 1600 670 V900 H0Z",
  "M0 790 C240 750 420 780 640 760 S1000 730 1200 770 S1480 800 1600 780 V900 H0Z",
];

interface Palette {
  sky: [string, string, string, string];
  sun: { cx: number; cy: number; r: number; fill: string; glow: string };
  ridges: [string, string, string, string];
  haze: number;
}

const PALETTES: Record<Exclude<Phase, "night">, Palette> = {
  dawn: {
    sky: ["#6f9cf0", "#b7c8f5", "#ffd9b8", "#ffb28f"],
    sun: { cx: 1376, cy: 270, r: 44, fill: "#fffaf0", glow: "#ffe2b8" },
    ridges: ["#b9c6ec", "#8b9bd3", "#5b6cae", "#2c3b78"],
    haze: 0.9,
  },
  day: {
    sky: ["#3f86ee", "#78acf6", "#b9d6fb", "#e4f0ff"],
    sun: { cx: 1200, cy: 150, r: 38, fill: "#ffffff", glow: "#fff6d9" },
    ridges: ["#a9c3ea", "#7c9ed6", "#4f74b0", "#27467d"],
    haze: 0.75,
  },
  dusk: {
    sky: ["#2e3f93", "#8a6db8", "#f29a9a", "#ffbe82"],
    sun: { cx: 1376, cy: 470, r: 52, fill: "#ffe3b0", glow: "#ffb27a" },
    ridges: ["#a48ac4", "#765fa6", "#4b3d7e", "#251f4f"],
    haze: 0.8,
  },
};

function phaseAt(hour: number): Phase {
  if (hour >= 5 && hour < 10) return "dawn";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 20) return "dusk";
  return "night";
}

// Re-check the clock once a minute so a page left open drifts from day into dusk.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/** The visitor's local time of day; the server (and first paint) assumes dawn. */
export function useSkyPhase(): Phase {
  return useSyncExternalStore(
    subscribe,
    () => phaseAt(new Date().getHours()),
    () => "dawn",
  );
}

// Fixed star field (a small linear congruential sequence) so server and client agree.
const STARS = (() => {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    out.push({
      x: next() * 1600,
      y: next() * 520,
      r: 0.6 + next() * 1.4,
      o: 0.35 + next() * 0.6,
    });
  }
  return out;
})();

const NIGHT_RIDGES = ["#283463", "#1c2650", "#131b3d", "#0a1029"];

function Painted({ id, p }: { id: string; p: Palette }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.45" stopColor={p.sky[1]} />
          <stop offset="0.72" stopColor={p.sky[2]} />
          <stop offset="1" stopColor={p.sky[3]} />
        </linearGradient>
        <radialGradient
          id={`${id}-glow`}
          cx={p.sun.cx / 1600}
          cy={p.sun.cy / 900}
          r="0.38"
        >
          <stop offset="0" stopColor={p.sun.glow} stopOpacity="0.95" />
          <stop offset="1" stopColor={p.sun.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <rect width="1600" height="900" fill={`url(#${id}-glow)`} />
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} fill={p.sun.fill} />
      {RIDGES.map((d, i) => (
        <g key={d}>
          <path d={d} fill={p.ridges[i]} />
          {i < RIDGES.length - 1 ? (
            <path d={d} fill="url(#ls-haze)" opacity={p.haze - i * 0.2} />
          ) : null}
        </g>
      ))}
    </>
  );
}

function Night() {
  return (
    <>
      <defs>
        <linearGradient id="ls-night-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050a1c" />
          <stop offset="0.6" stopColor="#14214d" />
          <stop offset="1" stopColor="#2b3474" />
        </linearGradient>
        <radialGradient id="ls-night-glow" cx="0.86" cy="0.62" r="0.42">
          <stop offset="0" stopColor="#6d7cff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6d7cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ls-night-sky)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <rect width="1600" height="900" fill="url(#ls-night-glow)" />
      {RIDGES.map((d, i) => (
        <path key={d} d={d} fill={NIGHT_RIDGES[i]} />
      ))}
    </>
  );
}

const FADE =
  "transition-opacity duration-1000 ease-out motion-reduce:transition-none";

export function Landscape({ className }: { className?: string }) {
  const phase = useSkyPhase();
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn("absolute inset-0 size-full", className)}
    >
      <defs>
        <linearGradient id="ls-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
        </linearGradient>
        {/* Film grain, so the sky reads as a scene rather than a flat gradient. */}
        <filter id="ls-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      {/* Light mode: every phase is stacked and the current one fades in. */}
      <g className="dark:hidden">
        {(Object.keys(PALETTES) as (keyof typeof PALETTES)[]).map((key) => (
          <g key={key} className={FADE} opacity={phase === key ? 1 : 0}>
            <Painted id={`ls-${key}`} p={PALETTES[key]} />
          </g>
        ))}
        <g className={FADE} opacity={phase === "night" ? 1 : 0}>
          <Night />
        </g>
      </g>
      <g className="hidden dark:block">
        <Night />
      </g>
      <rect
        width="1600"
        height="900"
        filter="url(#ls-grain)"
        opacity="0.07"
        style={{ mixBlendMode: "overlay" }}
      />
    </svg>
  );
}

/** "Sky set to your time · 3:42 PM": explains why the scene looks the way it does. */
export function SkyClock({ className }: { className?: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () =>
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    () => null,
  );
  if (!time) return null;
  return (
    <span
      className={cn(
        "rounded-full bg-black/25 px-3 py-1 text-mac-callout font-medium text-white ring-1 ring-white/20 backdrop-blur-md",
        className,
      )}
    >
      Sky set to your time · {time}
    </span>
  );
}

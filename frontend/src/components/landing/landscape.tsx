import { cn } from "@/lib/utils";

/**
 * The landing page's wallpaper: a valley at dawn (light) or the same valley at night
 * (dark), drawn as layered ridges so it costs no image download or licence.
 */

const RIDGES = [
  "M0 560 C200 500 320 520 480 470 S760 430 920 480 S1200 520 1360 470 S1540 450 1600 470 V900 H0Z",
  "M0 620 C160 580 300 600 440 560 S700 520 860 580 S1120 640 1300 590 S1520 560 1600 590 V900 H0Z",
  "M0 700 C180 650 360 690 520 650 S820 610 980 670 S1260 720 1420 680 S1560 660 1600 670 V900 H0Z",
  "M0 790 C240 750 420 780 640 760 S1000 730 1200 770 S1480 800 1600 780 V900 H0Z",
];
const DAWN = ["#b9c6ec", "#8b9bd3", "#5b6cae", "#2c3b78"];
const NIGHT = ["#283463", "#1c2650", "#131b3d", "#0a1029"];

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

export function Landscape({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn("absolute inset-0 size-full", className)}
    >
      <defs>
        <linearGradient id="ls-dawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6f9cf0" />
          <stop offset="0.45" stopColor="#b7c8f5" />
          <stop offset="0.72" stopColor="#ffd9b8" />
          <stop offset="1" stopColor="#ffb28f" />
        </linearGradient>
        <radialGradient id="ls-dawn-sun" cx="0.86" cy="0.3" r="0.38">
          <stop offset="0" stopColor="#fff6e2" stopOpacity="1" />
          <stop offset="0.25" stopColor="#ffe2b8" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffe2b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ls-night-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050a1c" />
          <stop offset="0.6" stopColor="#14214d" />
          <stop offset="1" stopColor="#2b3474" />
        </linearGradient>
        <radialGradient id="ls-night-glow" cx="0.86" cy="0.62" r="0.42">
          <stop offset="0" stopColor="#6d7cff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6d7cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ls-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <g className="dark:hidden">
        <rect width="1600" height="900" fill="url(#ls-dawn-sky)" />
        <rect width="1600" height="900" fill="url(#ls-dawn-sun)" />
        <circle cx="1376" cy="270" r="44" fill="#fffaf0" />
        {RIDGES.map((d, i) => (
          <g key={d}>
            <path d={d} fill={DAWN[i]} />
            {i < RIDGES.length - 1 ? (
              <path d={d} fill="url(#ls-haze)" opacity={0.9 - i * 0.2} />
            ) : null}
          </g>
        ))}
      </g>

      <g className="hidden dark:block">
        <rect width="1600" height="900" fill="url(#ls-night-sky)" />
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
        ))}
        <rect width="1600" height="900" fill="url(#ls-night-glow)" />
        {RIDGES.map((d, i) => (
          <path key={d} d={d} fill={NIGHT[i]} />
        ))}
      </g>
    </svg>
  );
}

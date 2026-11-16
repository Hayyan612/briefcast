/**
 * Per-episode playback positions, kept in this browser (a per-viewer convenience:
 * "resume where you left off"). Every read and write tolerates blocked storage.
 */
const KEY = "briefcast:positions:v1";
const EVENT = "briefcast:positions";

type Positions = Record<string, { t: number; d: number }>;

function read(): Positions {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Positions;
  } catch {
    return {};
  }
}

let cache: Positions | null = null;

export function getPositions(): Positions {
  cache ??= read();
  return cache;
}

export function savePosition(id: string, t: number, d: number) {
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return;
  const next = { ...getPositions(), [id]: { t: Math.round(t), d: Math.round(d) } };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep the in-memory copy */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePositions(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Where to resume: skip the first few seconds and the very end. */
export function resumeAt(id: string): number {
  const p = getPositions()[id];
  if (!p || p.t < 5 || p.t > p.d - 15) return 0;
  return p.t;
}

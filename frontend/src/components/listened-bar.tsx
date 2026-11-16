"use client";

import { useSyncExternalStore } from "react";

import { getPositions, subscribePositions } from "@/lib/positions";

const none = () => null;

/** Thin "how much have I heard" bar, like podcast apps show under an episode. */
export function ListenedBar({ episodeId }: { episodeId: string }) {
  const pos = useSyncExternalStore(
    subscribePositions,
    () => getPositions()[episodeId] ?? null,
    none,
  );
  if (!pos || pos.t < 5) return null;
  const fraction = Math.min(pos.t / pos.d, 1);
  if (fraction > 0.97) {
    return (
      <span className="text-mac-footnote font-medium text-mac-green">
        Played
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-2"
      aria-label={`${Math.round(fraction * 100)}% listened`}
    >
      <span className="h-1 w-20 overflow-hidden rounded-full bg-mac-fill-secondary">
        <span
          className="block h-full rounded-full bg-mac-accent"
          style={{ width: `${fraction * 100}%` }}
        />
      </span>
      <span className="text-mac-footnote text-mac-label-secondary tabular-nums">
        {Math.max(1, Math.round((pos.d - pos.t) / 60))} min left
      </span>
    </span>
  );
}

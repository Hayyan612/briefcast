"use client";

import { useSyncExternalStore } from "react";

import { formatDateTime } from "@/lib/format";

const noop = () => () => {};

/**
 * A timestamp in the viewer's own timezone. The server cannot know that zone, so SSR
 * and hydration use UTC and the browser swaps in local time right after hydrating.
 */
export function LocalTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const text = useSyncExternalStore(
    noop,
    () => formatDateTime(iso),
    () => `${formatDateTime(iso, "UTC")} UTC`,
  );
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}

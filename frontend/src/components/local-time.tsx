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

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeDay(iso: string): string {
  const when = new Date(iso);
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(when) - startOf(new Date())) / DAY_MS);
  const time = when.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days > 1 && days < 7) {
    return `${when.toLocaleDateString("en-US", { weekday: "long" })}, ${time}`;
  }
  return formatDateTime(iso);
}

/** "Today, 8:00 AM" / "Tomorrow, 8:00 AM" / "Friday, 8:00 AM", in the viewer's timezone. */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const text = useSyncExternalStore(
    noop,
    () => relativeDay(iso),
    () => `${formatDateTime(iso, "UTC")} UTC`,
  );
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}

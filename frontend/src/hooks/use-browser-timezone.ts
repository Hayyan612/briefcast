import { useSyncExternalStore } from "react";

const noop = () => () => {};

function detect(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The visitor's IANA timezone, read in the browser only. During SSR and hydration it
 * returns null, so server and client render the same markup.
 */
export function useBrowserTimezone(): string | null {
  return useSyncExternalStore(noop, detect, () => null);
}

/** All IANA zones the browser knows, with `current` guaranteed to be present. */
export function timezoneOptions(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return all.includes(current) ? all : [current, ...all];
}

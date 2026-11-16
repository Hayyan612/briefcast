import type { EpisodeStatus } from "./types";

export const STATUS_LABEL: Record<EpisodeStatus, string> = {
  queued: "Queued",
  researching: "Researching",
  writing: "Writing script",
  synthesizing: "Recording audio",
  ready: "Ready",
  failed: "Failed",
};

export const STATUS_PROGRESS: Record<EpisodeStatus, number> = {
  queued: 8,
  researching: 35,
  writing: 65,
  synthesizing: 85,
  ready: 100,
  failed: 100,
};

export function formatTime(hhmmss: string): string {
  const [h, m] = hhmmss.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

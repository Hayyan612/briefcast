/**
 * Umami custom events. Sends counts and labels only (never names, emails, topics or
 * URLs), and does nothing when Umami is not loaded (local dev, blocked, not configured).
 */
type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

export function track(event: string, data?: EventData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // Analytics must never break the app.
  }
}

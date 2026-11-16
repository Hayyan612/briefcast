export const OPEN_EVENT = "briefcast:open-now-playing";

/** Open the Now Playing view from anywhere (player bar title, dashboard card…). */
export function openNowPlaying() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

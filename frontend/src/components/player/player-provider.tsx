"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface PlayerTrack {
  id: string;
  title: string;
  topic: string;
}

interface PlayerState {
  track: PlayerTrack | null;
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  volume: number;
  play: (track: PlayerTrack) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

/**
 * One <audio> element for the whole app, so an episode keeps playing while the
 * listener moves between pages. Audio streams through the authenticated proxy.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  const play = useCallback(
    (next: PlayerTrack) => {
      const el = audio.current;
      if (!el) return;
      if (track?.id !== next.id) {
        el.src = `/api/backend/episodes/${next.id}/audio`;
        el.playbackRate = rate;
        setTrack(next);
        setTime(0);
      }
      void el.play();
    },
    [track?.id, rate],
  );

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el || !track) return;
    if (el.paused) void el.play();
    else el.pause();
  }, [track]);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (el && Number.isFinite(seconds)) el.currentTime = seconds;
  }, []);

  const skip = useCallback((delta: number) => {
    const el = audio.current;
    if (el)
      el.currentTime = Math.min(
        Math.max(el.currentTime + delta, 0),
        el.duration || 0,
      );
  }, []);

  const setRate = useCallback((value: number) => {
    if (audio.current) audio.current.playbackRate = value;
    setRateState(value);
  }, []);

  const setVolume = useCallback((value: number) => {
    if (audio.current) audio.current.volume = value;
    setVolumeState(value);
  }, []);

  // Space toggles playback when focus is not in a form field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.code !== "Space" || !track) return;
      if (
        target.closest(
          "input, textarea, button, [role=slider], [contenteditable]",
        )
      )
        return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, track]);

  const value = useMemo(
    () => ({
      track,
      playing,
      time,
      duration,
      rate,
      volume,
      play,
      toggle,
      seek,
      skip,
      setRate,
      setVolume,
    }),
    [
      track,
      playing,
      time,
      duration,
      rate,
      volume,
      play,
      toggle,
      seek,
      skip,
      setRate,
      setVolume,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        hidden
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

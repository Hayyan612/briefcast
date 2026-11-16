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

import { track as trackEvent } from "@/lib/analytics";
import { resumeAt, savePosition } from "@/lib/positions";

export interface PlayerTrack {
  id: string;
  title: string;
  topic: string;
  icon?: string | null;
  color?: string | null;
}

interface PlayerState {
  track: PlayerTrack | null;
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  volume: number;
  /** Play a track, optionally from a given second (otherwise resume where left off). */
  play: (track: PlayerTrack, startAt?: number) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  /** Exact playback position, read straight from the audio element (for frame-level sync). */
  getTime: () => number;
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
  const pendingSeek = useRef<number | null>(null);
  const lastSaved = useRef(0);

  const play = useCallback(
    (next: PlayerTrack, startAt?: number) => {
      const el = audio.current;
      if (!el) return;
      if (track?.id !== next.id) {
        trackEvent("episode_play");
        if (track && el.duration)
          savePosition(track.id, el.currentTime, el.duration);
        pendingSeek.current = startAt ?? resumeAt(next.id);
        el.src = `/api/backend/episodes/${next.id}/audio`;
        el.playbackRate = rate;
        setTrack(next);
        setTime(pendingSeek.current ?? 0);
      } else if (startAt !== undefined) {
        el.currentTime = startAt;
        setTime(startAt);
      }
      void el.play();
    },
    [track, rate],
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

  const getTime = useCallback(() => audio.current?.currentTime ?? 0, []);

  const setVolume = useCallback((value: number) => {
    if (audio.current) audio.current.volume = value;
    setVolumeState(value);
  }, []);

  // Space toggles playback when focus is not in a form field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (!track || !["Space", "ArrowLeft", "ArrowRight"].includes(e.code))
        return;
      if (
        target.closest(
          "input, textarea, button, [role=slider], [contenteditable]",
        )
      )
        return;
      e.preventDefault();
      if (e.code === "Space") toggle();
      else skip(e.code === "ArrowLeft" ? -15 : 15);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip, track]);

  // Media Session: macOS Now Playing, media keys, headphones and phone lock screens.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: track.title,
      artist: "Briefcast",
      album: track.topic,
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => void audio.current?.play()],
      ["pause", () => audio.current?.pause()],
      ["seekbackward", (d) => skip(-(d.seekOffset ?? 15))],
      ["seekforward", (d) => skip(d.seekOffset ?? 15)],
      ["seekto", (d) => d.seekTime !== undefined && seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported by this browser */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [track, skip, seek]);

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
      getTime,
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
      getTime,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          if (track)
            savePosition(
              track.id,
              e.currentTarget.currentTime,
              e.currentTarget.duration,
            );
        }}
        onEnded={(e) => {
          setPlaying(false);
          if (track)
            savePosition(
              track.id,
              e.currentTarget.duration,
              e.currentTarget.duration,
            );
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setTime(el.currentTime);
          if (track && Math.abs(el.currentTime - lastSaved.current) >= 5) {
            lastSaved.current = el.currentTime;
            savePosition(track.id, el.currentTime, el.duration);
          }
          if ("mediaSession" in navigator && Number.isFinite(el.duration)) {
            try {
              navigator.mediaSession.setPositionState({
                duration: el.duration,
                position: Math.min(el.currentTime, el.duration),
                playbackRate: el.playbackRate,
              });
            } catch {
              /* ignore */
            }
          }
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setDuration(el.duration);
          if (pendingSeek.current) {
            el.currentTime = pendingSeek.current;
            pendingSeek.current = null;
          }
        }}
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

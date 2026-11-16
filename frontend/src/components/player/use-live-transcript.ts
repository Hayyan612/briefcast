"use client";

import { useEffect, useState } from "react";

import { usePlayer } from "@/components/player/player-provider";
import { usePlaybackIndex } from "@/components/player/use-playback-index";
import { api } from "@/lib/api";
import type { EpisodeDetail, TranscriptLine } from "@/lib/types";

const cache = new Map<string, TranscriptLine[]>();

/** Transcript of whatever is playing, plus the index of the line being spoken. */
export function useLiveTranscript() {
  const { track } = usePlayer();
  const id = track?.id ?? null;
  const [lines, setLines] = useState<TranscriptLine[] | null>(() =>
    id ? (cache.get(id) ?? null) : null,
  );
  const [loadedFor, setLoadedFor] = useState<string | null>(
    id && cache.has(id) ? id : null,
  );

  if (id !== loadedFor && id && cache.has(id)) {
    setLines(cache.get(id) ?? null);
    setLoadedFor(id);
  }

  useEffect(() => {
    if (!id || cache.has(id)) return;
    let cancelled = false;
    api<EpisodeDetail>(`/episodes/${id}`)
      .then((d) => {
        cache.set(id, d.transcript ?? []);
        if (!cancelled) {
          setLines(d.transcript ?? []);
          setLoadedFor(id);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = loadedFor === id ? lines : null;
  const index = usePlaybackIndex(current, id);

  return { lines: current, index };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LanguagesIcon, PauseIcon, PlayIcon } from "@/components/icons";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { LANGUAGES, languageLabel } from "@/lib/languages";
import { notify } from "@/lib/notify";
import type { Voice } from "@/lib/types";

/** Language + voice pickers, with a cached Gnani preview of the chosen voice. */
export function VoiceFields({
  voices,
  language,
  voice,
  onChange,
}: {
  voices: Voice[];
  language: string;
  voice: string;
  onChange: (next: { language: string; voice: string }) => void;
}) {
  const available = useMemo(
    () => voices.filter((v) => v.languages.includes(language)),
    [voices, language],
  );
  const languageItems = useMemo(
    () =>
      Object.fromEntries(LANGUAGES.map((l) => [l.code, languageLabel(l.code)])),
    [],
  );
  const voiceItems = useMemo(
    () => Object.fromEntries(available.map((v) => [v.id, v.label])),
    [available],
  );

  function pickLanguage(code: string) {
    const keep = voices.find((v) => v.id === voice)?.languages.includes(code);
    const fallback =
      voices.find((v) => v.languages.includes(code))?.id ?? voice;
    onChange({ language: code, voice: keep ? voice : fallback });
  }

  return (
    <>
      <Field>
        <FieldLabel>Language</FieldLabel>
        <Select
          items={languageItems}
          value={language}
          onValueChange={(v) => v && pickLanguage(v)}
        >
          <SelectTrigger className="w-full">
            <LanguagesIcon className="mr-1.5 shrink-0 text-mac-label-secondary" />
            <SelectValue className="flex-1 text-left" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-72">
            {LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {languageLabel(l.code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Research uses sources in English; the episode is written and spoken in
          this language.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Voice</FieldLabel>
        <div className="flex gap-2">
          <Select
            items={voiceItems}
            value={voice}
            onValueChange={(v) => v && onChange({ language, voice: v })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {available.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PreviewButton voice={voice} language={language} />
        </div>
        <FieldDescription>
          Gnani.ai Timbre voices. Press play to hear a sample.
        </FieldDescription>
      </Field>
    </>
  );
}

function previewUrl(voice: string, language: string) {
  return `/api/backend/voices/${encodeURIComponent(voice)}/preview?language=${language}`;
}

function PreviewButton({
  voice,
  language,
}: {
  voice: string;
  language: string;
}) {
  const player = usePlayer();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  // True while a sample is loading or playing (read when the choice changes).
  const active = useRef(false);

  /** Start the sample for the current choice; events from a replaced sample are ignored. */
  const start = useCallback(
    (forVoice: string, forLanguage: string) => {
      audio.current?.pause();
      if (player.playing) player.toggle(); // never talk over the episode
      const el = new Audio(previewUrl(forVoice, forLanguage));
      audio.current = el;
      const current = () => audio.current === el;
      el.onplaying = () => current() && setState("playing");
      const stop = () => {
        active.current = false;
        setState("idle");
      };
      el.onended = () => current() && stop();
      el.onerror = () => {
        if (!current()) return;
        stop();
        notify.error("Could not load the voice sample");
      };
      el.play().catch(() => current() && stop());
    },
    [player],
  );

  // Switching voice or language mid-sample plays the new voice straight away,
  // so voices can be compared back to back.
  useEffect(() => {
    if (active.current) start(voice, language);
  }, [voice, language, start]);

  // Stop the sample when the form closes.
  useEffect(() => () => audio.current?.pause(), []);

  function toggle() {
    if (state !== "idle") {
      audio.current?.pause();
      audio.current = null;
      active.current = false;
      setState("idle");
      return;
    }
    active.current = true;
    setState("loading");
    start(voice, language);
  }

  const label = state === "playing" ? "Stop sample" : "Play voice sample";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={label}
      onClick={toggle}
    >
      {state === "loading" ? (
        <Spinner />
      ) : state === "playing" ? (
        <PauseIcon />
      ) : (
        <PlayIcon />
      )}
    </Button>
  );
}

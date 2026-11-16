"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
            <LanguagesIcon className="shrink-0 text-muted-foreground" />
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

  // Stop the sample if the choice changes or the form closes.
  useEffect(() => {
    return () => {
      audio.current?.pause();
    };
  }, [voice, language]);

  async function toggle() {
    if (state === "playing") {
      audio.current?.pause();
      setState("idle");
      return;
    }
    if (player.playing) player.toggle(); // never talk over the episode
    const el = new Audio(
      `/api/backend/voices/${encodeURIComponent(voice)}/preview?language=${language}`,
    );
    audio.current = el;
    el.onplaying = () => setState("playing");
    el.onended = () => setState("idle");
    el.onerror = () => {
      setState("idle");
      notify.error("Could not load the voice sample");
    };
    setState("loading");
    try {
      await el.play();
    } catch {
      setState("idle");
    }
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

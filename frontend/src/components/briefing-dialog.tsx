"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { notify as toast } from "@/lib/notify";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  SourceFields,
  sourceDefaults,
  type SourceSettings,
} from "@/components/source-fields";
import { CoverPicker } from "@/components/cover-picker";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRightIcon } from "@/components/icons";
import { InterestPicker } from "@/components/interest-picker";
import { composeTopic, isComposedTopic } from "@/lib/interests";
import { TimeSelect, TimezonePicker } from "@/components/schedule-fields";
import { VoiceFields } from "@/components/voice-fields";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { splitList } from "@/lib/sources";
import type { Briefing, Voice } from "@/lib/types";

const EXAMPLES = [
  "Startup funding announced in the last 24 hours",
  "New AI model releases and research papers",
  "Indian stock market moves and the reasons behind them",
];

interface Props {
  voices: Voice[];
  briefing?: Briefing;
  /** Interests to start a new briefing with (e.g. picked on the Discover page). */
  initialInterests?: string[];
  /** Element that opens the dialog. Omit when controlling `open` from outside. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BriefingDialog({
  voices,
  briefing,
  trigger,
  initialInterests,
  ...controlled
}: Props) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlled.open ?? localOpen;
  const setOpen = controlled.onOpenChange ?? setLocalOpen;
  const [saving, setSaving] = useState(false);
  const [picks, setPicks] = useState<string[]>(
    () => briefing?.interests ?? initialInterests ?? [],
  );
  // A briefing whose topic is not the brief composed from its interests (hand-written, or
  // created before interests existed) keeps that wording until the picks change.
  const [topicEdit, setTopicEdit] = useState<string | null>(() =>
    briefing && !isComposedTopic(briefing.topic, briefing.interests)
      ? briefing.topic
      : null,
  );
  const topic = topicEdit ?? composeTopic(picks);
  const topicOk = topic.trim().length >= 5;
  const [time, setTime] = useState(
    briefing?.delivery_time.slice(0, 5) ?? "08:00",
  );
  const detectedTz = useBrowserTimezone();
  const [chosenTz, setTimezone] = useState<string | null>(
    briefing?.timezone ?? null,
  );
  const timezone = chosenTz ?? detectedTz ?? "Asia/Kolkata";
  const [voice, setVoice] = useState(briefing?.voice ?? voices[0]?.id ?? "");
  const [language, setLanguage] = useState(briefing?.language ?? "en-IN");
  const [emailEnabled, setEmailEnabled] = useState(
    briefing?.email_enabled ?? true,
  );
  const [sources, setSources] = useState<SourceSettings>(() =>
    sourceDefaults(briefing),
  );
  const [cover, setCover] = useState<{
    icon: string | null;
    color: string | null;
  }>({
    icon: briefing?.icon ?? null,
    color: briefing?.color ?? null,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = JSON.stringify({
        topic,
        interests: picks,
        delivery_time: time,
        timezone,
        voice,
        language,
        email_enabled: emailEnabled,
        trusted_domains: splitList(sources.trusted),
        blocked_domains: splitList(sources.blocked),
        region: sources.region || null,
        lookback: sources.lookback,
        finance_mode: sources.finance,
        watch_urls: splitList(sources.watch),
        icon: cover.icon,
        color: cover.color,
      });
      if (briefing) {
        await api(`/briefings/${briefing.id}`, { method: "PATCH", body });
        toast.success("Briefing updated");
      } else {
        await api("/briefings", { method: "POST", body });
        track("briefing_created", { interests: picks.length, language });
        toast.success("Briefing scheduled", {
          description:
            "Choose “Make an episode now” from its menu to hear one right away.",
        });
        setPicks([]);
        setTopicEdit(null);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={save} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="text-mac-title-2">
              {briefing ? "Edit briefing" : "New daily briefing"}
            </DialogTitle>
            <DialogDescription>
              Pick up to six interests, or write your own brief. The agent
              researches it from fresh sources and sends you a five-minute
              episode every day.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Interests</FieldLabel>
              <InterestPicker
                picks={picks}
                onChange={(next) => {
                  setPicks(next);
                  setTopicEdit(null);
                }}
              />
            </Field>
            <Collapsible
              defaultOpen={topicEdit !== null || picks.length === 0}
              className="rounded-mac-group border border-mac-separator"
            >
              <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left">
                <ChevronRightIcon className="size-4 text-mac-label-secondary transition-transform duration-200 group-data-[panel-open]:rotate-90" />
                <span className="font-medium">
                  {picks.length
                    ? "Fine-tune the brief"
                    : "Or describe it in your own words"}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <Field>
                  <FieldLabel htmlFor="topic" className="sr-only">
                    Brief
                  </FieldLabel>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopicEdit(e.target.value)}
                    placeholder={EXAMPLES[0]}
                    maxLength={500}
                    rows={3}
                  />
                  <FieldDescription>
                    What the research agent is asked to cover. Be specific, for
                    example “{EXAMPLES[1]}”.
                  </FieldDescription>
                </Field>
              </CollapsibleContent>
            </Collapsible>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field>
                <FieldLabel htmlFor="time">Daily at</FieldLabel>

                <TimeSelect id="time" value={time} onChange={setTime} />
              </Field>

              <Field>
                <FieldLabel htmlFor="time-zone">Timezone</FieldLabel>

                <TimezonePicker
                  id="time-zone"

                  value={timezone}

                  onChange={setTimezone}
                />
              </Field>
            </div>
            <VoiceFields
              voices={voices}
              language={language}
              voice={voice}
              onChange={(next) => {
                setLanguage(next.language);
                setVoice(next.voice);
              }}
            />
            <CoverPicker
              topic={topic}
              icon={cover.icon}
              color={cover.color}
              onChange={setCover}
            />
            <SourceFields value={sources} onChange={setSources} />
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="email-enabled">
                  Email me each episode
                </FieldLabel>
                <FieldDescription>
                  A link arrives as soon as it is ready.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="email-enabled"
                checked={emailEnabled}
                onCheckedChange={(v) => setEmailEnabled(v)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={saving || !topicOk}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {briefing ? "Save changes" : "Schedule briefing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { notify as toast } from "@/lib/notify";

import {
  ArrowLeftIcon,
  ChevronRightIcon,
  AudioLinesIcon,
  ClockIcon,
  GlobalIcon,
  MailIcon,
  SearchIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { InterestPicker } from "@/components/interest-picker";
import { OnboardingSources } from "@/components/onboarding-sources";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VoiceFields } from "@/components/voice-fields";
import {
  timezoneOptions,
  useBrowserTimezone,
} from "@/hooks/use-browser-timezone";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { composeTopic, coverForPicks, MAX_PICKS } from "@/lib/interests";
import { languageLabel } from "@/lib/languages";
import {
  LOOKBACKS,
  REGIONS,
  regionForTimezone,
  type Lookback,
} from "@/lib/sources";
import type { Briefing, EpisodeSummary, Voice } from "@/lib/types";

const HOW = [
  {
    icon: SearchIcon,
    title: "Research",
    text: "An agent searches fresh sources and reads the key articles.",
  },
  {
    icon: AudioLinesIcon,
    title: "Record",
    text: "It writes a five-minute script, voiced by Gnani.ai.",
  },
  {
    icon: MailIcon,
    title: "Deliver",
    text: "You get an email the moment the episode is ready.",
  },
];

const STEPS = [
  "Welcome",
  "Interests",
  "Sources",
  "Schedule",
  "Review",
] as const;

export function Onboarding({
  voices,
  name,
}: {
  voices: Voice[];
  name?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [picks, setPicks] = useState<string[]>([]);
  // A hand-edited brief wins over the one composed from the picks.
  const [topicEdit, setTopicEdit] = useState<string | null>(null);
  const topic = topicEdit ?? composeTopic(picks);
  const [time, setTime] = useState("08:00");
  const detectedTz = useBrowserTimezone();
  const [chosenTz, setTimezone] = useState<string | null>(null);
  const timezone = chosenTz ?? detectedTz ?? "Asia/Kolkata";
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [language, setLanguage] = useState("en-IN");
  const [busy, setBusy] = useState(false);
  const [chosenRegion, setRegion] = useState<string | null>(null);
  const region = chosenRegion ?? regionForTimezone(timezone);
  const [lookback, setLookback] = useState<Lookback>("day");
  const [emailEnabled, setEmailEnabled] = useState(true);

  const timezones = useMemo(() => timezoneOptions(timezone), [timezone]);
  const voiceItems = useMemo(
    () => Object.fromEntries(voices.map((v) => [v.id, v.label])),
    [voices],
  );
  const topicOk = topic.trim().length >= 5;

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  }

  async function finish() {
    setBusy(true);
    try {
      const briefing = await api<Briefing>("/briefings", {
        method: "POST",
        body: JSON.stringify({
          topic,
          ...coverForPicks(picks),
          delivery_time: time,
          timezone,
          voice,
          language,
          region: region || null,
          lookback,
          email_enabled: emailEnabled,
        }),
      });
      const episode = await api<EpisodeSummary>(
        `/briefings/${briefing.id}/run`,
        { method: "POST" },
      );
      toast.success("Your first episode is on its way", {
        description: "It takes about two minutes. You can watch it being made.",
      });
      router.push(`/episodes/${episode.id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  const first = name?.split(" ")[0];

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4 py-6 md:py-10">
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-mac-body text-mac-label-secondary">
          <span>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
        </div>
        <Progress
          value={((step + 1) / STEPS.length) * 100}
          aria-label="Onboarding progress"
        />
      </div>

      <Card className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: 24 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * direction }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6"
          >
            {step === 0 ? (
              <>
                <CardHeader>
                  <CardTitle className="text-mac-title-1 font-bold">
                    {first ? `Welcome, ${first}` : "Welcome to Briefcast"}
                  </CardTitle>
                  <CardDescription className="text-mac-title-3">
                    Pick a topic and a time. Every day you get a five-minute
                    podcast on it, researched from that day’s sources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ItemGroup className="gap-2">
                    {HOW.map(({ icon: Icon, title, text }) => (
                      <Item key={title} variant="muted" size="sm">
                        <ItemMedia variant="icon" className="text-mac-accent">
                          <Icon />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{title}</ItemTitle>
                          <ItemDescription>{text}</ItemDescription>
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button size="lg" onClick={() => go(1)} autoFocus>
                    Get started
                  </Button>
                </CardFooter>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <CardHeader>
                  <CardTitle className="text-mac-title-1 font-bold">
                    What are you into?
                  </CardTitle>
                  <CardDescription className="text-mac-title-3">
                    Pick up to {MAX_PICKS} interests and we blend them into one
                    daily episode, like a mix made for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <InterestPicker
                    picks={picks}
                    onChange={(next) => {
                      setPicks(next);
                      setTopicEdit(null);
                    }}
                  />
                  {picks.length ? (
                    <Collapsible className="rounded-mac-group border border-mac-separator">
                      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left">
                        <ChevronRightIcon className="size-4 text-mac-label-secondary transition-transform duration-200 group-data-[panel-open]:rotate-90" />
                        <span className="font-medium">Fine-tune the brief</span>
                        <span className="ml-auto truncate text-mac-callout text-mac-label-secondary max-sm:hidden">
                          What the research agent is asked to cover
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        <Field>
                          <FieldLabel htmlFor="ob-topic" className="sr-only">
                            Brief
                          </FieldLabel>
                          <Textarea
                            id="ob-topic"
                            rows={3}
                            maxLength={500}
                            value={topic}
                            onChange={(e) => setTopicEdit(e.target.value)}
                          />
                        </Field>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : null}
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => go(0)}>
                    <ArrowLeftIcon data-icon="inline-start" />
                    Back
                  </Button>
                  <Button size="lg" disabled={!topicOk} onClick={() => go(2)}>
                    Continue
                  </Button>
                </CardFooter>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <CardHeader>
                  <CardTitle className="text-mac-title-1 font-bold">
                    Where should the news come from?
                  </CardTitle>
                  <CardDescription className="text-mac-title-3">
                    We set this from your time zone. You can change it any time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OnboardingSources
                    region={region}
                    lookback={lookback}
                    onRegion={setRegion}
                    onLookback={setLookback}
                  />
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => go(1)}>
                    <ArrowLeftIcon data-icon="inline-start" />
                    Back
                  </Button>
                  <Button size="lg" onClick={() => go(3)}>
                    Continue
                  </Button>
                </CardFooter>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <CardHeader>
                  <CardTitle className="text-mac-title-1 font-bold">
                    When, and in which language?
                  </CardTitle>
                  <CardDescription className="text-mac-title-3">
                    A new episode is ready at this time every day.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                      <Field>
                        <FieldLabel htmlFor="ob-time">Daily at</FieldLabel>
                        <Input
                          id="ob-time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Timezone</FieldLabel>
                        <Select
                          value={timezone}
                          onValueChange={(v) => v && setTimezone(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            alignItemWithTrigger={false}
                            className="max-h-72"
                          >
                            {timezones.map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                {tz.replaceAll("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  </FieldGroup>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => go(2)}>
                    <ArrowLeftIcon data-icon="inline-start" />
                    Back
                  </Button>
                  <Button size="lg" onClick={() => go(4)}>
                    Continue
                  </Button>
                </CardFooter>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <CardHeader>
                  <CardTitle className="text-mac-title-1 font-bold">
                    Ready to go
                  </CardTitle>
                  <CardDescription className="text-mac-title-3">
                    We’ll make your first episode now, so you can hear it
                    straight away.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ItemGroup className="gap-2">
                    <Item variant="outline">
                      <ItemMedia variant="icon" className="text-mac-accent">
                        <SearchIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>Topic</ItemDescription>
                        <ItemTitle className="line-clamp-2">{topic}</ItemTitle>
                      </ItemContent>
                    </Item>
                    <Item variant="outline">
                      <ItemMedia variant="icon" className="text-mac-accent">
                        <ClockIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>Every day</ItemDescription>
                        <ItemTitle>
                          {formatTime(`${time}:00`)} ·{" "}
                          {timezone.replaceAll("_", " ")}
                        </ItemTitle>
                      </ItemContent>
                    </Item>
                    <Item variant="outline">
                      <ItemMedia variant="icon" className="text-mac-accent">
                        <AudioLinesIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>Language and voice</ItemDescription>
                        <ItemTitle>
                          {languageLabel(language)} ·{" "}
                          {voiceItems[voice]?.split(" · ")[0]}
                        </ItemTitle>
                      </ItemContent>
                    </Item>
                    <Item variant="outline">
                      <ItemMedia variant="icon" className="text-mac-accent">
                        <GlobalIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>Sources</ItemDescription>
                        <ItemTitle>
                          {REGIONS.find((r) => r.value === region)?.label} ·{" "}
                          {LOOKBACKS.find((l) => l.value === lookback)?.label}
                        </ItemTitle>
                      </ItemContent>
                    </Item>
                  </ItemGroup>
                  <Field orientation="horizontal" className="mt-4">
                    <FieldContent>
                      <FieldLabel htmlFor="ob-email">
                        Email me when each episode is ready
                      </FieldLabel>
                      <FieldDescription>
                        A link to listen, sent to your Google address.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="ob-email"
                      checked={emailEnabled}
                      onCheckedChange={(v) => setEmailEnabled(v)}
                    />
                  </Field>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => go(3)} disabled={busy}>
                    <ArrowLeftIcon data-icon="inline-start" />
                    Back
                  </Button>
                  <Button size="lg" onClick={finish} disabled={busy}>
                    {busy ? <Spinner data-icon="inline-start" /> : null}
                    Create my first episode
                  </Button>
                </CardFooter>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}

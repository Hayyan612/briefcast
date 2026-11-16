"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  ArrowLeftIcon,
  AudioLinesIcon,
  ClockIcon,
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  timezoneOptions,
  useBrowserTimezone,
} from "@/hooks/use-browser-timezone";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import type { Briefing, EpisodeSummary, Voice } from "@/lib/types";

const SUGGESTIONS = [
  "Startup funding announced in the last 24 hours",
  "New AI models, papers and product launches",
  "Indian stock market moves and why they happened",
  "Climate tech and clean energy news",
  "Cricket results and talking points",
  "Big tech policy and regulation",
];

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

const STEPS = ["Welcome", "Topic", "Schedule", "Review"] as const;

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
  const [topic, setTopic] = useState("");
  const [time, setTime] = useState("08:00");
  const detectedTz = useBrowserTimezone();
  const [chosenTz, setTimezone] = useState<string | null>(null);
  const timezone = chosenTz ?? detectedTz ?? "Asia/Kolkata";
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

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
        body: JSON.stringify({ topic, delivery_time: time, timezone, voice }),
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                  <CardTitle className="text-2xl font-bold">
                    {first ? `Welcome, ${first}` : "Welcome to Briefcast"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Pick a topic and a time. Every day you get a five-minute
                    podcast on it, researched from that day’s sources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ItemGroup className="gap-2">
                    {HOW.map(({ icon: Icon, title, text }) => (
                      <Item key={title} variant="muted" size="sm">
                        <ItemMedia variant="icon" className="text-primary">
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
                  <CardTitle className="text-2xl font-bold">
                    What should we follow?
                  </CardTitle>
                  <CardDescription className="text-base">
                    Choose a starting point or write your own. Specific topics
                    make better episodes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <ToggleGroup
                      aria-label="Suggested topics"
                      value={SUGGESTIONS.includes(topic) ? [topic] : []}
                      onValueChange={(v) => setTopic((v as string[])[0] ?? "")}
                      variant="outline"
                      orientation="vertical"
                      className="w-full"
                    >
                      {SUGGESTIONS.map((s) => (
                        <ToggleGroupItem
                          key={s}
                          value={s}
                          className="h-auto justify-start py-2.5 text-left whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold aria-pressed:text-primary"
                        >
                          {s}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <Field>
                      <FieldLabel htmlFor="ob-topic">
                        Or describe your own
                      </FieldLabel>
                      <Textarea
                        id="ob-topic"
                        rows={2}
                        maxLength={500}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Funding rounds for Indian fintech startups"
                      />
                    </Field>
                  </FieldGroup>
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
                  <CardTitle className="text-2xl font-bold">
                    When do you want it?
                  </CardTitle>
                  <CardDescription className="text-base">
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
                    <Field>
                      <FieldLabel>Voice</FieldLabel>
                      <Select
                        items={voiceItems}
                        value={voice}
                        onValueChange={(v) => v && setVoice(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {voices.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Gnani.ai Timbre voices. You can change this later.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
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
                  <CardTitle className="text-2xl font-bold">
                    Ready to go
                  </CardTitle>
                  <CardDescription className="text-base">
                    We’ll make your first episode now, so you can hear it
                    straight away.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ItemGroup className="gap-2">
                    <Item variant="outline">
                      <ItemMedia variant="icon" className="text-primary">
                        <SearchIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>Topic</ItemDescription>
                        <ItemTitle className="line-clamp-2">{topic}</ItemTitle>
                      </ItemContent>
                    </Item>
                    <Item variant="outline">
                      <ItemMedia variant="icon" className="text-primary">
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
                      <ItemMedia variant="icon" className="text-primary">
                        <AudioLinesIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemDescription>Voice</ItemDescription>
                        <ItemTitle>{voiceItems[voice]}</ItemTitle>
                      </ItemContent>
                    </Item>
                  </ItemGroup>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => go(2)} disabled={busy}>
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

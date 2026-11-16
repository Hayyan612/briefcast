"use client";

import { useMemo, useState, type ReactElement } from "react";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  timezoneOptions,
  useBrowserTimezone,
} from "@/hooks/use-browser-timezone";
import { api } from "@/lib/api";
import type { Briefing, Voice } from "@/lib/types";

const EXAMPLES = [
  "Startup funding announced in the last 24 hours",
  "New AI model releases and research papers",
  "Indian stock market moves and the reasons behind them",
];

interface Props {
  voices: Voice[];
  briefing?: Briefing;
  /** Element that opens the dialog. Omit when controlling `open` from outside. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BriefingDialog({
  voices,
  briefing,
  trigger,
  ...controlled
}: Props) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlled.open ?? localOpen;
  const setOpen = controlled.onOpenChange ?? setLocalOpen;
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState(briefing?.topic ?? "");
  const [time, setTime] = useState(
    briefing?.delivery_time.slice(0, 5) ?? "08:00",
  );
  const detectedTz = useBrowserTimezone();
  const [chosenTz, setTimezone] = useState<string | null>(
    briefing?.timezone ?? null,
  );
  const timezone = chosenTz ?? detectedTz ?? "Asia/Kolkata";
  const [voice, setVoice] = useState(briefing?.voice ?? voices[0]?.id ?? "");

  const timezones = useMemo(() => timezoneOptions(timezone), [timezone]);
  const voiceItems = useMemo(
    () => Object.fromEntries(voices.map((v) => [v.id, v.label])),
    [voices],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = JSON.stringify({
        topic,
        delivery_time: time,
        timezone,
        voice,
      });
      if (briefing) {
        await api(`/briefings/${briefing.id}`, { method: "PATCH", body });
        toast.success("Briefing updated");
      } else {
        await api("/briefings", { method: "POST", body });
        toast.success("Briefing scheduled", {
          description: "Use “Run now” to hear one right away.",
        });
        setTopic("");
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {briefing ? "Edit briefing" : "New daily briefing"}
            </DialogTitle>
            <DialogDescription>
              The agent researches this topic from fresh sources every day and
              sends you a five-minute episode.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="topic">Topic</FieldLabel>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={EXAMPLES[0]}
                minLength={5}
                maxLength={500}
                required
                rows={3}
              />
              <FieldDescription>
                Be specific. For example: “{EXAMPLES[1]}” or “{EXAMPLES[2]}”.
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field>
                <FieldLabel htmlFor="time">Daily at</FieldLabel>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
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
              <FieldDescription>Gnani.ai Timbre voices.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {briefing ? "Save changes" : "Schedule briefing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

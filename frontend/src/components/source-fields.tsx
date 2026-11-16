"use client";

import { useState } from "react";

import { ChevronRightIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { REGIONS } from "@/lib/sources";

export interface SourceSettings {
  trusted: string;
  blocked: string;
  region: string;
  lookback: "day" | "week";
  finance: boolean;
  watch: string;
}

export function sourceDefaults(b?: {
  trusted_domains: string[];
  blocked_domains: string[];
  region: string | null;
  lookback: "day" | "week";
  finance_mode: boolean;
  watch_urls: string[];
}): SourceSettings {
  return {
    trusted: (b?.trusted_domains ?? []).join(", "),
    blocked: (b?.blocked_domains ?? []).join(", "),
    region: b?.region ?? "",
    lookback: b?.lookback ?? "day",
    finance: b?.finance_mode ?? false,
    watch: (b?.watch_urls ?? []).join("\n"),
  };
}

/** Advanced source controls: trusted/blocked sites, region, window, market mode, followed sites. */
export function SourceFields({
  value,
  onChange,
}: {
  value: SourceSettings;
  onChange: (next: SourceSettings) => void;
}) {
  const set = <K extends keyof SourceSettings>(key: K, v: SourceSettings[K]) =>
    onChange({ ...value, [key]: v });
  const customised =
    value.trusted ||
    value.blocked ||
    value.region ||
    value.watch ||
    value.finance ||
    value.lookback !== "day";
  const [open, setOpen] = useState(Boolean(customised));
  const regionItems = Object.fromEntries(
    REGIONS.map((r) => [r.value, r.label]),
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-90" />
        <span className="font-medium">Sources and websites</span>
        {customised ? (
          <Badge variant="secondary" className="ml-auto">
            Customised
          </Badge>
        ) : (
          <span className="ml-auto text-mac-footnote text-muted-foreground">
            Optional
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FieldGroup className="border-t px-3 pt-4 pb-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>News window</FieldLabel>
              <ToggleGroup
                aria-label="News window"
                value={[value.lookback]}
                onValueChange={(v) => {
                  const next = (v as string[])[0];
                  if (next === "day" || next === "week") set("lookback", next);
                }}
                variant="outline"
              >
                <ToggleGroupItem value="day">Last 24 hours</ToggleGroupItem>
                <ToggleGroupItem value="week">Last 7 days</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel>Region</FieldLabel>
              <Select
                items={regionItems}
                value={value.region}
                onValueChange={(v) => set("region", v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.value || "any"} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="trusted">Trusted sites</FieldLabel>
            <Textarea
              id="trusted"
              rows={2}
              value={value.trusted}
              onChange={(e) => set("trusted", e.target.value)}
              placeholder="inc42.com, entrackr.com, techcrunch.com"
            />
            <FieldDescription>
              Searched first on every run. Separate with commas.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="blocked">Never use</FieldLabel>
            <Textarea
              id="blocked"
              rows={1}
              value={value.blocked}
              onChange={(e) => set("blocked", e.target.value)}
              placeholder="example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="watch">Follow websites</FieldLabel>
            <Textarea
              id="watch"
              rows={2}
              value={value.watch}
              onChange={(e) => set("watch", e.target.value)}
              placeholder={
                "https://openai.com/news\nhttps://www.anthropic.com/news"
              }
            />
            <FieldDescription>
              Up to 3, one per line. New pages on them are added to your
              episode.
            </FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="finance">Market mode</FieldLabel>
              <FieldDescription>
                Focus on prices, earnings and deals.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="finance"
              checked={value.finance}
              onCheckedChange={(v) => set("finance", v)}
            />
          </Field>
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  );
}

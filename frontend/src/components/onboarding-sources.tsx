"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LOOKBACKS, REGIONS, type Lookback } from "@/lib/sources";

const PICKED =
  "data-pressed:bg-mac-accent data-pressed:text-white data-pressed:hover:bg-mac-accent/90";

/** Onboarding step: where the news comes from, and how far back each episode looks. */
export function OnboardingSources({
  region,
  lookback,
  onRegion,
  onLookback,
}: {
  region: string;
  lookback: Lookback;
  onRegion: (region: string) => void;
  onLookback: (lookback: Lookback) => void;
}) {
  return (
    <div className="grid gap-6">
      <Field>
        <FieldLabel id="ob-region">Focus on news from</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="ob-region"
          className="flex flex-wrap gap-2"
        >
          {REGIONS.map((r) => (
            <Toggle
              key={r.value || "anywhere"}
              role="radio"
              aria-checked={region === r.value}
              variant="outline"
              size="lg"
              pressed={region === r.value}
              onPressedChange={() => onRegion(r.value)}
              className={PICKED}
            >
              {r.label}
            </Toggle>
          ))}
        </div>
        <FieldDescription>
          Search favours outlets from this region. Pick Anywhere for a global
          view.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel id="ob-lookback">How fresh</FieldLabel>
        <ToggleGroup
          aria-labelledby="ob-lookback"
          value={[lookback]}
          onValueChange={(v) => {
            const next = (v as string[])[0];
            if (next === "day" || next === "week") onLookback(next);
          }}
          variant="outline"
          className="grid w-full grid-cols-2"
        >
          {LOOKBACKS.map((l) => (
            <ToggleGroupItem
              key={l.value}
              value={l.value}
              className="h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left whitespace-normal"
            >
              <span className="font-semibold">{l.label}</span>
              <span className="text-mac-callout font-normal text-mac-label-secondary in-data-pressed:text-mac-label">
                {l.hint}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
    </div>
  );
}

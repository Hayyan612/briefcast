"use client";

import { useMemo } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timezoneOptions } from "@/hooks/use-browser-timezone";
import { formatTime } from "@/lib/format";

const STEP_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Delivery time as an in-app menu (15-minute steps), so it looks and works the same on
 * every OS; the native time input is a spinner, a clock or a wheel depending on platform.
 */
export function TimeSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (hhmm: string) => void;
}) {
  const items = useMemo(() => {
    const grid = Array.from(
      { length: MINUTES_PER_DAY / STEP_MINUTES },
      (_, i) => toHHMM(i * STEP_MINUTES),
    );
    const all = grid.includes(value) ? grid : [...grid, value].sort();
    return Object.fromEntries(all.map((t) => [t, formatTime(`${t}:00`)]));
  }, [value]);

  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger className="max-h-72">
        {Object.entries(items).map(([t, label]) => (
          <SelectItem key={t} value={t}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Old IANA spellings browsers still report, so a search for the current name finds them.
const ALIASES: Record<string, string> = {
  Calcutta: "Kolkata",
  Saigon: "Ho Chi Minh",
  Kiev: "Kyiv",
  Katmandu: "Kathmandu",
  Rangoon: "Yangon",
};

interface Zone {
  id: string;
  city: string;
  area: string;
  offset: string;
}

function describe(id: string): Zone {
  const parts = id.split("/");
  const raw = (parts.at(-1) ?? id).replaceAll("_", " ");
  const city = ALIASES[raw] ?? raw;
  const area = parts.length > 1 ? parts[0].replaceAll("_", " ") : "";
  let offset = "";
  try {
    offset =
      new Intl.DateTimeFormat("en-US", {
        timeZone: id,
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    /* unknown zone: leave the offset out */
  }
  return { id, city, area, offset };
}

const label = (z: Zone) => (z.offset ? `${z.city} (${z.offset})` : z.city);

/** Searchable time zone picker: type a city, region or offset ("Dubai", "GMT+4"). */
export function TimezonePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (timezone: string) => void;
}) {
  const zones = useMemo(() => timezoneOptions(value).map(describe), [value]);
  const selected = zones.find((z) => z.id === value) ?? null;

  return (
    <Combobox
      items={zones}
      value={selected}
      onValueChange={(z) => z && onChange(z.id)}
      itemToStringLabel={label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={(z, query) => {
        const q = query.trim().toLowerCase();
        return (
          !q ||
          `${z.city} ${z.area} ${z.offset} ${z.id}`.toLowerCase().includes(q)
        );
      }}
    >
      <ComboboxInput id={id} placeholder="Search a city" className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No matching time zone</ComboboxEmpty>
        <ComboboxList>
          {(z: Zone) => (
            <ComboboxItem key={z.id} value={z}>
              <span className="min-w-0 flex-1 truncate">{z.city}</span>
              <span className="text-mac-callout text-mac-label-secondary tabular-nums">
                {z.offset}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

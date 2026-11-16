/** Region choices (Tavily country names); "" means anywhere. */
export const REGIONS = [
  { value: "", label: "Anywhere" },
  { value: "india", label: "India" },
  { value: "united states", label: "United States" },
  { value: "united kingdom", label: "United Kingdom" },
  { value: "united arab emirates", label: "UAE" },
  { value: "singapore", label: "Singapore" },
  { value: "germany", label: "Germany" },
  { value: "canada", label: "Canada" },
  { value: "australia", label: "Australia" },
  { value: "japan", label: "Japan" },
] as const;

/** "a.com, b.com\nc.com" → ["a.com", "b.com", "c.com"] */
export function splitList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TIMEZONE_REGIONS: [RegExp, string][] = [
  [/^Asia\/(Kolkata|Calcutta)$/, "india"],
  [/^Asia\/Dubai$/, "united arab emirates"],
  [/^Asia\/Singapore$/, "singapore"],
  [/^Asia\/Tokyo$/, "japan"],
  [/^Europe\/London$/, "united kingdom"],
  [/^Europe\/Berlin$/, "germany"],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax)$/, "canada"],
  [
    /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage)$/,
    "united states",
  ],
  [/^Australia\//, "australia"],
];

/** A sensible default region for someone in `timezone` ("" = anywhere). */
export function regionForTimezone(timezone: string): string {
  return TIMEZONE_REGIONS.find(([re]) => re.test(timezone))?.[1] ?? "";
}

export const LOOKBACKS = [
  { value: "day", label: "Daily update", hint: "News from the last 24 hours" },
  {
    value: "week",
    label: "Weekly roundup",
    hint: "The best of the last 7 days",
  },
] as const;
export type Lookback = (typeof LOOKBACKS)[number]["value"];

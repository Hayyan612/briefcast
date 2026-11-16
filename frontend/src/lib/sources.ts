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

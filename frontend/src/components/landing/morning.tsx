/**
 * What happens on a real morning for an 8:00 briefing. Times follow how the app works:
 * the agent starts at the scheduled time, reads up to six articles in full, and an
 * episode takes two to four minutes to make.
 */
const STEPS = [
  {
    time: "8:00",
    title: "Searches the web",
    text: "Fresh news on each of your interests, skipping stories you have already heard.",
  },
  {
    time: "8:01",
    title: "Reads what matters",
    text: "Up to six articles in full, plus any links you added and sites you follow.",
  },
  {
    time: "8:02",
    title: "Writes the script",
    text: "Five minutes, in your language, with every claim tied to its source.",
  },
  {
    time: "8:03",
    title: "Records and sends",
    text: "A Gnani.ai voice reads it, and a link lands in your inbox.",
  },
];

export function Morning() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-[14px] bg-mac-separator ring-1 ring-black/5 sm:grid-cols-2 dark:ring-white/10">
      {STEPS.map((s) => (
        <li key={s.time} className="grid content-start gap-2 bg-mac-window p-5">
          <span className="text-mac-callout font-semibold text-mac-accent tabular-nums">
            {s.time} AM
          </span>
          <span className="text-mac-title-3 font-semibold">{s.title}</span>
          <span className="text-mac-body text-mac-label-secondary">
            {s.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

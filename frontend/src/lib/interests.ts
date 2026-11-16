import type { CoverColor, CoverIcon } from "@/lib/cover";

export interface InterestCategory {
  id: string;
  label: string;
  icon: CoverIcon;
  color: CoverColor;
  interests: readonly string[];
}

/** Browsable starting points for onboarding. Anything else can be typed in. */
export const INTEREST_CATEGORIES: readonly InterestCategory[] = [
  {
    id: "ai",
    label: "AI and tech",
    icon: "cpu",
    color: "indigo",
    interests: [
      "New AI model launches",
      "AI research papers",
      "Open-source AI",
      "AI in India",
      "Developer tools",
      "Cybersecurity",
    ],
  },
  {
    id: "startups",
    label: "Startups and VC",
    icon: "wallet",
    color: "green",
    interests: [
      "Indian startup funding",
      "Global VC rounds",
      "Fintech",
      "SaaS",
      "D2C brands",
      "Startup IPOs",
    ],
  },
  {
    id: "markets",
    label: "Markets and money",
    icon: "graph",
    color: "teal",
    interests: [
      "Nifty and Sensex moves",
      "RBI and interest rates",
      "Mutual funds",
      "Global markets",
      "Crypto",
      "Commodities and gold",
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: "buildings",
    color: "blue",
    interests: [
      "Indian business news",
      "Company earnings",
      "Mergers and acquisitions",
      "E-commerce and retail",
      "Auto industry",
      "Telecom",
    ],
  },
  {
    id: "policy",
    label: "Policy and politics",
    icon: "gavel",
    color: "graphite",
    interests: [
      "Indian politics",
      "Tech regulation",
      "Budget and taxes",
      "Court rulings",
      "Elections worldwide",
    ],
  },
  {
    id: "world",
    label: "World",
    icon: "globe",
    color: "blue",
    interests: [
      "Geopolitics",
      "Gulf and Middle East",
      "US news",
      "China",
      "Europe",
      "South Asia",
    ],
  },
  {
    id: "science",
    label: "Science and space",
    icon: "rocket",
    color: "purple",
    interests: [
      "ISRO and space missions",
      "Physics breakthroughs",
      "Biotech",
      "Astronomy",
      "Climate science",
    ],
  },
  {
    id: "climate",
    label: "Climate and energy",
    icon: "leaf",
    color: "green",
    interests: [
      "Clean energy",
      "Electric vehicles",
      "Climate policy",
      "Extreme weather",
      "Climate tech startups",
    ],
  },
  {
    id: "sport",
    label: "Sport",
    icon: "football",
    color: "orange",
    interests: [
      "Cricket",
      "Football",
      "Formula 1",
      "Tennis",
      "Chess",
      "Olympic sports",
    ],
  },
  {
    id: "health",
    label: "Health",
    icon: "heart",
    color: "red",
    interests: [
      "Medical research",
      "Fitness and nutrition",
      "Mental health",
      "Healthcare in India",
      "Longevity science",
    ],
  },
  {
    id: "gadgets",
    label: "Gadgets and gaming",
    icon: "smartphone",
    color: "pink",
    interests: [
      "Smartphone launches",
      "Apple",
      "Laptops and PCs",
      "Video games",
      "Wearables",
    ],
  },
  {
    id: "careers",
    label: "Work and careers",
    icon: "case",
    color: "yellow",
    interests: [
      "Tech hiring and layoffs",
      "Remote work",
      "Jobs in the Gulf",
      "Skills and courses",
      "Workplace trends",
    ],
  },
  {
    id: "cities",
    label: "Cities",
    icon: "buildings",
    color: "teal",
    interests: [
      "Mumbai news",
      "Bengaluru news",
      "Delhi news",
      "Real estate",
      "Urban transport",
    ],
  },
  {
    id: "ideas",
    label: "Ideas and learning",
    icon: "lightbulb",
    color: "orange",
    interests: [
      "History",
      "Psychology",
      "Economics explained",
      "Education",
      "Big ideas and essays",
    ],
  },
  {
    id: "culture",
    label: "Culture",
    icon: "cup",
    color: "pink",
    interests: [
      "Bollywood",
      "Streaming releases",
      "Music",
      "Books",
      "Food and travel",
    ],
  },
];

export const MAX_PICKS = 6;
export const MIN_CUSTOM_LENGTH = 3;
export const MAX_CUSTOM_LENGTH = 80;

export function categoryOf(interest: string): InterestCategory | undefined {
  return INTEREST_CATEGORIES.find((c) => c.interests.includes(interest));
}

/** Interests matching a search, across every category. */
export function searchInterests(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits = INTEREST_CATEGORIES.flatMap((c) =>
    c.label.toLowerCase().includes(q)
      ? c.interests
      : c.interests.filter((i) => i.toLowerCase().includes(q)),
  );
  return [...new Set(hits)];
}

/** The briefing topic for a set of picks: one daily episode covering all of them. */
export function composeTopic(picks: readonly string[]): string {
  if (picks.length === 0) return "";
  if (picks.length === 1) {
    return `${picks[0]}: the most important news and developments`;
  }
  return `Daily mix: ${picks.join(", ")}. Cover the most important new developments in each.`;
}

/** Cover for a mix: the first pick's category, or the default podcast tile. */
export function coverForPicks(picks: readonly string[]): {
  icon: CoverIcon;
  color: CoverColor;
} {
  const first = picks.map(categoryOf).find(Boolean);
  if (!first) return { icon: "podcast", color: "blue" };
  return {
    icon: picks.length > 1 ? "podcast" : first.icon,
    color: first.color,
  };
}

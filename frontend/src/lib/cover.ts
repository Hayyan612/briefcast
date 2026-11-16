import {
  AtomIcon,
  BuildingsIcon,
  CaseIcon,
  ChartIcon,
  CpuIcon,
  CupIcon,
  FootballIcon,
  GavelIcon,
  GlobalIcon,
  GraphUpIcon,
  HeartPulseIcon,
  LeafIcon,
  LightbulbIcon,
  MedalStarIcon,
  PodcastIcon,
  RocketIcon,
  ShieldIcon,
  SmartphoneIcon,
  SunIcon,
  WalletMoneyIcon,
} from "@solar-icons/react/bold";

/** Cover glyphs (keys mirror the API's ICONS). */
export const COVER_ICONS = {
  podcast: { Icon: PodcastIcon, label: "Podcast" },
  wallet: { Icon: WalletMoneyIcon, label: "Funding" },
  graph: { Icon: GraphUpIcon, label: "Markets" },
  cpu: { Icon: CpuIcon, label: "AI and tech" },
  gavel: { Icon: GavelIcon, label: "Policy" },
  heart: { Icon: HeartPulseIcon, label: "Health" },
  football: { Icon: FootballIcon, label: "Sport" },
  rocket: { Icon: RocketIcon, label: "Space" },
  leaf: { Icon: LeafIcon, label: "Climate" },
  globe: { Icon: GlobalIcon, label: "World" },
  buildings: { Icon: BuildingsIcon, label: "Business" },
  lightbulb: { Icon: LightbulbIcon, label: "Ideas" },
  shield: { Icon: ShieldIcon, label: "Security" },
  smartphone: { Icon: SmartphoneIcon, label: "Gadgets" },
  cup: { Icon: CupIcon, label: "Lifestyle" },
  medal: { Icon: MedalStarIcon, label: "Awards" },
  case: { Icon: CaseIcon, label: "Careers" },
  sun: { Icon: SunIcon, label: "Weather" },
  atom: { Icon: AtomIcon, label: "Science" },
  chart: { Icon: ChartIcon, label: "Data" },
} as const;
export type CoverIcon = keyof typeof COVER_ICONS;

/** macOS system colors (keys mirror the API's COLORS and IconTile's color variants). */
export const COVER_COLORS = {
  blue: "#0088ff",
  indigo: "#6155f5",
  purple: "#cb30e0",
  pink: "#ff2d55",
  red: "#ff383c",
  orange: "#ff8d28",
  yellow: "#ffcc00",
  green: "#34c759",
  teal: "#00c3d0",
  graphite: "#5d5d62",
} as const;
export type CoverColor = keyof typeof COVER_COLORS;

const GUESSES: [RegExp, CoverIcon, CoverColor][] = [
  [/\b(ai|model|llm|machine learning|gpt|agent|chip)/i, "cpu", "indigo"],
  [/\b(fund|startup|vc|raise|seed|series)/i, "wallet", "green"],
  [/\b(stock|market|invest|ipo|crypto|economy)/i, "graph", "teal"],
  [/\b(policy|government|election|law|regulat|court)/i, "gavel", "graphite"],
  [/\b(health|medic|bio|pharma)/i, "heart", "red"],
  [/\b(sport|football|cricket|nba|f1|match)/i, "football", "orange"],
  [/\b(space|launch|nasa|rocket)/i, "rocket", "purple"],
  [/\b(climate|energy|clean|solar|carbon)/i, "leaf", "green"],
  [/\b(world|global|geopolit)/i, "globe", "blue"],
  [/\b(science|research|physics)/i, "atom", "purple"],
];
const FALLBACK: CoverColor[] = ["blue", "purple", "pink", "orange", "teal", "indigo"];

/** The briefing's chosen cover, or a guess from its topic. */
export function resolveCover(
  topic: string,
  icon?: string | null,
  color?: string | null,
): { icon: CoverIcon; color: CoverColor } {
  const hit = GUESSES.find(([re]) => re.test(topic));
  let h = 0;
  for (const ch of topic) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const guessIcon: CoverIcon = hit ? hit[1] : "podcast";
  const guessColor: CoverColor = hit ? hit[2] : FALLBACK[h % FALLBACK.length];
  return {
    icon: icon && icon in COVER_ICONS ? (icon as CoverIcon) : guessIcon,
    color: color && color in COVER_COLORS ? (color as CoverColor) : guessColor,
  };
}

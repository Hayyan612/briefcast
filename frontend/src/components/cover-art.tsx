import {
  CpuIcon,
  FootballIcon,
  GavelIcon,
  GlobalIcon,
  GraphUpIcon,
  HeartPulseIcon,
  LeafIcon,
  PodcastIcon,
  RocketIcon,
  WalletMoneyIcon,
} from "@solar-icons/react/bold";

import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

type TileColor =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "pink"
  | "teal"
  | "indigo"
  | "red"
  | "graphite";

// Topic → glyph and macOS system color, like the tiles in System Settings.
const TOPICS: [RegExp, typeof PodcastIcon, TileColor][] = [
  [/\b(ai|model|llm|machine learning|gpt|agent|chip)/i, CpuIcon, "indigo"],
  [/\b(fund|startup|vc|raise|seed|series)/i, WalletMoneyIcon, "green"],
  [/\b(stock|market|invest|ipo|crypto|economy)/i, GraphUpIcon, "teal"],
  [/\b(policy|government|election|law|regulat|court)/i, GavelIcon, "graphite"],
  [/\b(health|medic|bio|pharma)/i, HeartPulseIcon, "red"],
  [/\b(sport|football|cricket|nba|f1|match)/i, FootballIcon, "orange"],
  [/\b(space|launch|nasa|rocket)/i, RocketIcon, "purple"],
  [/\b(climate|energy|clean|solar|carbon)/i, LeafIcon, "green"],
  [/\b(world|global|geopolit)/i, GlobalIcon, "blue"],
];
const FALLBACK: TileColor[] = [
  "blue",
  "purple",
  "pink",
  "orange",
  "teal",
  "indigo",
];

function pick(topic: string): [typeof PodcastIcon, TileColor] {
  const hit = TOPICS.find(([re]) => re.test(topic));
  if (hit) return [hit[1], hit[2]];
  let h = 0;
  for (const ch of topic) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [PodcastIcon, FALLBACK[h % FALLBACK.length]];
}

/** Briefing cover: a macOS icon tile in a system color with a subject glyph. */
export function CoverArt({
  topic,
  className,
}: {
  topic: string;
  className?: string;
}) {
  const [Icon, color] = pick(topic);
  return (
    <IconTile
      color={color}
      size="lg"
      aria-hidden
      className={cn("shrink-0 [&_svg]:size-[55%]!", className)}
    >
      <Icon />
    </IconTile>
  );
}

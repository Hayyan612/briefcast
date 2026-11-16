import { IconTile } from "@/components/ui/icon-tile";
import { COVER_ICONS, resolveCover } from "@/lib/cover";
import { cn } from "@/lib/utils";

/** Briefing cover: a macOS icon tile with the chosen (or guessed) glyph and system color. */
export function CoverArt({
  topic,
  icon,
  color,
  className,
}: {
  topic: string;
  icon?: string | null;
  color?: string | null;
  className?: string;
}) {
  const cover = resolveCover(topic, icon, color);
  const { Icon } = COVER_ICONS[cover.icon];
  return (
    <IconTile
      color={cover.color}
      size="lg"
      aria-hidden
      className={cn("shrink-0 [&_svg]:size-[55%]!", className)}
    >
      <Icon />
    </IconTile>
  );
}

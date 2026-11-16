import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Square "cover" for a briefing: a kit Avatar with the topic's initials. */
export function CoverArt({
  topic,
  className,
}: {
  topic: string;
  className?: string;
}) {
  const initials = topic
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <Avatar className={cn("size-10 rounded-lg after:rounded-lg", className)}>
      <AvatarFallback className="rounded-lg bg-primary/10 font-bold text-primary">
        {initials || "B"}
      </AvatarFallback>
    </Avatar>
  );
}

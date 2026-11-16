import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { STATUS_LABEL } from "@/lib/format";
import { IN_PROGRESS, type EpisodeStatus } from "@/lib/types";

/** Status in macOS system colors: green ready, orange working, red failed. */
export function StatusBadge({ status }: { status: EpisodeStatus }) {
  if (IN_PROGRESS.includes(status)) {
    return (
      <Badge variant="secondary" className="gap-1.5 text-mac-orange">
        <Spinner className="size-3" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  const tone = status === "failed" ? "bg-mac-red" : "bg-mac-green";
  return (
    <Badge variant="secondary" className="gap-1.5">
      <span aria-hidden className={`size-2 rounded-full ${tone}`} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

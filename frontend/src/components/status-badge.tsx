import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { STATUS_LABEL } from "@/lib/format";
import { IN_PROGRESS, type EpisodeStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: EpisodeStatus }) {
  if (IN_PROGRESS.includes(status)) {
    return (
      <Badge variant="secondary">
        <Spinner data-icon="inline-start" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge variant={status === "failed" ? "destructive" : "outline"}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

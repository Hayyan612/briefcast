"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notify as toast } from "@/lib/notify";
import {
  CalendarClockIcon,
  EllipsisIcon,
  MicIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "@/components/icons";

import { BriefingDialog } from "@/components/briefing-dialog";
import { LocalTime } from "@/components/local-time";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { IN_PROGRESS, type Briefing, type Voice } from "@/lib/types";

export function BriefingCard({
  briefing,
  voices,
}: {
  briefing: Briefing;
  voices: Voice[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"run" | "toggle" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const latest = briefing.latest_episode;
  const generating = latest ? IN_PROGRESS.includes(latest.status) : false;
  const voiceLabel = voices
    .find((v) => v.id === briefing.voice)
    ?.label.split(" · ")[0];

  async function act(
    kind: "run" | "toggle" | "delete",
    fn: () => Promise<unknown>,
    ok: string,
  ) {
    setBusy(kind);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="font-heading text-lg leading-snug">
          {briefing.topic}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <CalendarClockIcon data-icon="inline-start" />
            Daily at {formatTime(briefing.delivery_time)}
          </Badge>
          <Badge variant="outline">
            {briefing.timezone.replaceAll("_", " ")}
          </Badge>
          {voiceLabel ? (
            <Badge variant="outline">
              <MicIcon data-icon="inline-start" />
              {voiceLabel}
            </Badge>
          ) : null}
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Briefing options"
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0 text-sm text-muted-foreground">
        {briefing.is_active ? (
          <>
            Next episode <LocalTime iso={briefing.next_run_at} />
          </>
        ) : (
          "Paused. No episodes will be generated."
        )}
        {latest ? (
          <div className="mt-3 flex items-center gap-2">
            <span>Latest episode</span>
            <StatusBadge status={latest.status} />
            <Link
              href={`/episodes/${latest.id}`}
              className={buttonVariants({
                variant: "link",
                size: "sm",
                className: "ml-auto px-0",
              })}
            >
              Open
            </Link>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id={`active-${briefing.id}`}
            checked={briefing.is_active}
            disabled={busy === "toggle"}
            onCheckedChange={(checked) =>
              act(
                "toggle",
                () =>
                  api(`/briefings/${briefing.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ is_active: checked }),
                  }),
                checked ? "Briefing resumed" : "Briefing paused",
              )
            }
          />
          <Label htmlFor={`active-${briefing.id}`}>Active</Label>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="sm"
                disabled={busy === "run" || generating}
                onClick={() =>
                  act(
                    "run",
                    () =>
                      api(`/briefings/${briefing.id}/run`, { method: "POST" }),
                    "Episode started. It takes two to four minutes.",
                  )
                }
              />
            }
          >
            {busy === "run" || generating ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlayIcon data-icon="inline-start" />
            )}
            {generating ? "Generating" : "Run now"}
          </TooltipTrigger>
          <TooltipContent>Generate today’s episode immediately</TooltipContent>
        </Tooltip>
      </CardFooter>

      <BriefingDialog
        voices={voices}
        briefing={briefing}
        open={editing}
        onOpenChange={setEditing}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this briefing?</AlertDialogTitle>
            <AlertDialogDescription>
              Its schedule stops and all of its episodes are deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy === "delete"}
              onClick={() =>
                act(
                  "delete",
                  () => api(`/briefings/${briefing.id}`, { method: "DELETE" }),
                  "Briefing deleted",
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

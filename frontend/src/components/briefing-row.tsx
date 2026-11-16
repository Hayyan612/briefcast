"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AddLinkDialog } from "@/components/add-link-dialog";
import { BriefingDialog } from "@/components/briefing-dialog";
import { CoverArt } from "@/components/cover-art";
import {
  EllipsisIcon,
  LinkIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "@/components/icons";
import { RelativeTime } from "@/components/local-time";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { notify as toast } from "@/lib/notify";
import { IN_PROGRESS, type Briefing, type Voice } from "@/lib/types";

const DEFAULT_LANGUAGE = "en-IN";

/**
 * One scheduled briefing in the "Up next" list: what it is and when it next plays.
 * Everything else (run now, pause, edit, links, delete) lives in its menu.
 */
export function BriefingRow({
  briefing,
  voices,
}: {
  briefing: Briefing;
  voices: Voice[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const latest = briefing.latest_episode;
  const generating = latest ? IN_PROGRESS.includes(latest.status) : false;

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const setActive = (isActive: boolean) =>
    act(
      () =>
        api(`/briefings/${briefing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: isActive }),
        }),
      isActive ? "Briefing resumed" : "Briefing paused",
    );

  return (
    <li className="flex min-w-0 items-center gap-3 px-3 py-2.5">
      <CoverArt
        topic={briefing.topic}
        icon={briefing.icon}
        color={briefing.color}
        className="size-10 shrink-0 rounded-[10px] [&_svg]:size-[55%]!"
      />
      <Link
        href={`/dashboard?briefing=${briefing.id}`}
        className="grid min-w-0 flex-1 gap-0.5 rounded-mac-item outline-offset-2 focus-visible:outline-2 focus-visible:outline-mac-accent"
      >
        <span className="line-clamp-2 font-semibold text-mac-label">
          {briefing.topic}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-mac-callout text-mac-label-secondary">
          {generating ? (
            <span className="inline-flex items-center gap-1 text-mac-accent">
              <Spinner className="size-3" />
              Making today’s episode
            </span>
          ) : briefing.is_active ? (
            <RelativeTime iso={briefing.next_run_at} />
          ) : (
            <span>Paused</span>
          )}
          {briefing.language !== DEFAULT_LANGUAGE ? (
            <Badge variant="outline">
              {languageLabel(briefing.language).split(" · ")[0]}
            </Badge>
          ) : null}
          {briefing.pending_links ? (
            <Badge variant="outline">
              {briefing.pending_links}{" "}
              {briefing.pending_links === 1 ? "link" : "links"} queued
            </Badge>
          ) : null}
        </span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label={`Options for ${briefing.topic}`}
            />
          }
        >
          {busy ? <Spinner /> : <EllipsisIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={generating}
            onClick={() =>
              act(
                () => api(`/briefings/${briefing.id}/run`, { method: "POST" }),
                "Episode started. It takes two to four minutes.",
              )
            }
          >
            <PlayIcon />
            Make an episode now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActive(!briefing.is_active)}>
            {briefing.is_active ? <PauseIcon /> : <PlayIcon />}
            {briefing.is_active ? "Pause schedule" : "Resume schedule"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilIcon />
            Edit…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAddingLink(true)}>
            <LinkIcon />
            Add a link…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon />
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BriefingDialog
        voices={voices}
        briefing={briefing}
        open={editing}
        onOpenChange={setEditing}
      />
      <AddLinkDialog
        briefing={briefing}
        open={addingLink}
        onOpenChange={setAddingLink}
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
              disabled={busy}
              onClick={() =>
                act(
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
    </li>
  );
}

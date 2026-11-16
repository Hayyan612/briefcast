"use client";

import { useState } from "react";

import {
  CopyCheckIcon,
  CopyIcon,
  RotateCcwIcon,
  RssIcon,
} from "@/components/icons";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";

/** Private RSS feed: subscribe once in any podcast app and new episodes arrive there. */
export function FeedDialog() {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load(path?: Promise<{ path: string }>) {
    setBusy(true);
    try {
      const res = await (path ?? api<{ path: string }>("/me/feed"));
      setUrl(`${window.location.origin}${res.path}`);
    } catch (err) {
      notify.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const podcastUrl = url ? url.replace(/^https?:\/\//, "podcast://") : "#";

  return (
    <>
      <SidebarMenuButton
        onClick={() => {
          setOpen(true);
          if (!url) void load();
        }}
      >
        <RssIcon />
        Podcast feed
      </SidebarMenuButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Listen in your podcast app</DialogTitle>
            <DialogDescription>
              Every new episode from all your briefings appears in Apple
              Podcasts, Overcast or any app that accepts a feed URL.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="feed-url">Your private feed</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="feed-url"
                readOnly
                value={url ?? ""}
                placeholder={busy ? "Creating your feed…" : ""}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-mac-footnote"
              />
              <Button
                variant="outline"
                size="icon-lg"
                aria-label={copied ? "Copied" : "Copy feed link"}
                disabled={!url}
                onClick={copy}
              >
                {busy ? (
                  <Spinner />
                ) : copied ? (
                  <CopyCheckIcon className="text-mac-green" />
                ) : (
                  <CopyIcon />
                )}
              </Button>
            </div>
            <FieldDescription>
              Treat it like a password: anyone with this link can hear your
              episodes.
            </FieldDescription>
          </Field>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              size="lg"
              disabled={!url || busy}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset link
            </Button>
            <a
              href={podcastUrl}
              aria-disabled={!url}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full bg-mac-accent px-4 text-mac-body font-medium text-white"
            >
              Open in Podcasts
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your feed link?</AlertDialogTitle>
            <AlertDialogDescription>
              The current link stops working right away. Any podcast app using
              it will need the new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmReset(false);
                await load(
                  api<{ path: string }>("/me/feed/rotate", { method: "POST" }),
                );
                notify.success("Feed link reset", {
                  description: "Copy the new link into your app.",
                });
              }}
            >
              Reset link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

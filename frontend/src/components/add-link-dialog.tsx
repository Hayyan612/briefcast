"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LinkIcon, PlayIcon, Trash2Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Briefing, EpisodeSummary } from "@/lib/types";

interface Link {
  id: string;
  url: string;
  title: string | null;
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Add an article the agent must cover, in the next episode or one made right now. */
export function AddLinkDialog({
  briefing,
  open,
  onOpenChange,
}: {
  briefing: Briefing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"queue" | "now" | null>(null);
  const [links, setLinks] = useState<Link[] | null>(null);

  async function refresh() {
    setLinks(
      await api<Link[]>(`/briefings/${briefing.id}/links`).catch(() => []),
    );
  }

  async function submit(runNow: boolean) {
    setError(null);
    setBusy(runNow ? "now" : "queue");
    try {
      const res = await api<{ episode: EpisodeSummary | null }>(
        `/briefings/${briefing.id}/links`,
        {
          method: "POST",
          body: JSON.stringify({ url, run_now: runNow }),
        },
      );
      setUrl("");
      router.refresh();
      if (runNow && res.episode) {
        notify.success("Making an episode from your link", {
          description: "About two minutes.",
        });
        onOpenChange(false);
        router.push(`/episodes/${res.episode.id}`);
      } else {
        notify.success("Link added", {
          description: "It will be covered in the next episode.",
        });
        void refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    await api(`/briefings/${briefing.id}/links/${id}`, { method: "DELETE" });
    router.refresh();
    void refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) void refresh();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a link</DialogTitle>
            <DialogDescription>
              Paste an article or report. The agent reads it and covers it in “
              {briefing.topic}”.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="link-url">Link</FieldLabel>
            <Input
              id="link-url"
              type="url"
              inputMode="url"
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(error)}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>
                Up to 3 links can wait for the next episode.
              </FieldDescription>
            )}
          </Field>
          {links && links.length > 0 ? (
            <ItemGroup className="gap-1.5">
              {links.map((l) => (
                <Item key={l.id} variant="muted" size="sm">
                  <ItemMedia variant="icon">
                    <LinkIcon />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="truncate">
                      {l.title ?? host(l.url)}
                    </ItemTitle>
                    <ItemDescription className="truncate">
                      {l.url}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${host(l.url)}`}
                      onClick={() => void remove(l.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button
              type="submit"
              variant="outline"
              size="lg"
              disabled={!url || busy !== null}
            >
              {busy === "queue" ? <Spinner data-icon="inline-start" /> : null}
              Add to next episode
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!url || busy !== null}
              onClick={() => void submit(true)}
            >
              {busy === "now" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              Make an episode now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BriefingDialog } from "@/components/briefing-dialog";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { MAX_PICKS, topicAfterAdding } from "@/lib/interests";
import { notify as toast } from "@/lib/notify";
import type { Briefing, Voice } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * An interest outside onboarding: a pill whose menu starts a new briefing with it or adds
 * it to one of the user's existing mixes.
 */
export function InterestChip({
  interest,
  briefings,
  voices,
}: {
  interest: string;
  briefings: Briefing[];
  voices: Voice[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const following = briefings.filter((b) =>
    b.interests.some((i) => i.toLowerCase() === interest.toLowerCase()),
  );

  async function addTo(b: Briefing) {
    setBusy(true);
    try {
      await api(`/briefings/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          interests: [...b.interests, interest],
          topic: topicAfterAdding(b, interest),
        }),
      });
      track("interest_added", { interest });
      toast.success(`Added ${interest}`, {
        description: "It is in your next episode.",
      });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              className={cn(
                "rounded-full",
                following.length && "text-mac-accent dark:text-mac-link",
              )}
            />
          }
        >
          {following.length ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          {interest}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <PlusIcon />
            Start a new briefing
          </DropdownMenuItem>
          {briefings.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Add to a briefing</DropdownMenuLabel>
                {briefings.map((b) => {
                  const has = following.includes(b);
                  const full = b.interests.length >= MAX_PICKS;
                  return (
                    <DropdownMenuItem
                      key={b.id}
                      disabled={has || full}
                      onClick={() => addTo(b)}
                    >
                      {has ? <CheckIcon /> : null}
                      <span className="min-w-0 flex-1 truncate">{b.topic}</span>
                      {full && !has ? (
                        <span className="text-mac-callout opacity-70">
                          Full
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {creating ? (
        <BriefingDialog
          voices={voices}
          initialInterests={[interest]}
          open={creating}
          onOpenChange={setCreating}
        />
      ) : null}
    </>
  );
}

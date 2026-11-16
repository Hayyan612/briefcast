"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CompassIcon } from "@/components/icons";
import { InterestChip } from "@/components/interest-chip";
import { Card, CardContent } from "@/components/ui/card";
import { suggestionsFor } from "@/lib/interests";
import type { Briefing, Voice } from "@/lib/types";

/** Dashboard card: interests next to the ones you follow, and a way into Discover. */
export function MoreLikeThis({
  briefings,
  voices,
}: {
  briefings: Briefing[];
  voices: Voice[];
}) {
  const suggestions = useMemo(
    () =>
      suggestionsFor(
        briefings.flatMap((b) => b.interests),
        6,
      ),
    [briefings],
  );
  return (
    <section aria-labelledby="more-like-this" className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 id="more-like-this" className="text-mac-title-2 font-bold">
          {suggestions.length ? "More like this" : "Find something new"}
        </h2>
        <Link
          href="/discover"
          className="flex items-center gap-1.5 text-mac-body text-mac-link hover:underline"
        >
          <CompassIcon className="size-4" />
          Discover
        </Link>
      </div>
      <Card className="py-0">
        <CardContent className="grid gap-3 p-4">
          {suggestions.length ? (
            <>
              <p className="text-mac-callout text-mac-label-secondary">
                Next to what you already follow. Add one to a briefing, or start
                a new one.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <InterestChip
                    key={s}
                    interest={s}
                    briefings={briefings}
                    voices={voices}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-mac-callout text-mac-label-secondary">
              Browse fifteen categories, from markets and cricket to your city,
              and add what you like to a briefing.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

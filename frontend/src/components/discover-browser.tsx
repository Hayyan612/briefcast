"use client";

import { useMemo, useState } from "react";

import { InterestChip } from "@/components/interest-chip";
import { IconTile } from "@/components/ui/icon-tile";
import { SearchField } from "@/components/ui/search-field";
import { COVER_ICONS } from "@/lib/cover";
import {
  INTEREST_CATEGORIES,
  searchInterests,
  suggestionsFor,
} from "@/lib/interests";
import type { Briefing, Voice } from "@/lib/types";

/** Browse every interest by category, or search; each one can start or join a briefing. */
export function DiscoverBrowser({
  briefings,
  voices,
}: {
  briefings: Briefing[];
  voices: Voice[];
}) {
  const [query, setQuery] = useState("");
  const followed = useMemo(
    () => briefings.flatMap((b) => b.interests),
    [briefings],
  );
  const suggested = useMemo(() => suggestionsFor(followed, 8), [followed]);
  const matches = searchInterests(query);
  const chip = (interest: string) => (
    <InterestChip
      key={interest}
      interest={interest}
      briefings={briefings}
      voices={voices}
    />
  );

  return (
    <div className="grid gap-10">
      <header className="grid gap-4">
        <div className="grid gap-1">
          <h1 className="text-mac-large-title font-bold tracking-[-0.02em]">
            Discover
          </h1>
          <p className="text-mac-title-3 text-mac-label-secondary">
            Find something new to follow. Start a briefing with it, or add it to
            one you have.
          </p>
        </div>
        <SearchField
          size="xl"
          aria-label="Search interests"
          placeholder="Search interests"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xl"
        />
      </header>

      {query.trim() ? (
        <section aria-label="Search results" className="grid gap-3">
          {matches.length ? (
            <div className="flex flex-wrap gap-2">{matches.map(chip)}</div>
          ) : (
            <p className="text-mac-body text-mac-label-secondary">
              “{query.trim()}” is not in the list, but you can still follow it:
              anything the agent can search for works.
            </p>
          )}
          {query.trim().length >= 3 && !matches.length ? (
            <div className="flex flex-wrap gap-2">{chip(query.trim())}</div>
          ) : null}
        </section>
      ) : (
        <>
          {suggested.length ? (
            <section aria-labelledby="suggested" className="grid gap-3">
              <h2 id="suggested" className="text-mac-title-2 font-bold">
                More like what you follow
              </h2>
              <div className="flex flex-wrap gap-2">{suggested.map(chip)}</div>
            </section>
          ) : null}
          <div className="grid gap-8 md:grid-cols-2">
            {INTEREST_CATEGORIES.map((c) => {
              const { Icon } = COVER_ICONS[c.icon];
              return (
                <section
                  key={c.id}
                  aria-labelledby={`cat-${c.id}`}
                  className="grid content-start gap-3"
                >
                  <h2
                    id={`cat-${c.id}`}
                    className="flex items-center gap-2.5 text-mac-title-3 font-semibold"
                  >
                    <IconTile color={c.color} size="lg">
                      <Icon />
                    </IconTile>
                    {c.label}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {c.interests.map(chip)}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

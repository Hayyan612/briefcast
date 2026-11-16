"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { SearchField } from "@/components/ui/search-field";
import { Toggle } from "@/components/ui/toggle";
import { COVER_ICONS } from "@/lib/cover";
import {
  INTEREST_CATEGORIES,
  MAX_CUSTOM_LENGTH,
  MAX_PICKS,
  MIN_CUSTOM_LENGTH,
  searchInterests,
} from "@/lib/interests";

const ENTER = { opacity: 0, y: 6 };
const SHOWN = { opacity: 1, y: 0 };

/**
 * Spotify-style interest discovery: browse category tiles, open one to see what it
 * covers, pick several, or search and add anything that is not listed.
 */
export function InterestPicker({
  picks,
  onChange,
}: {
  picks: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const full = picks.length >= MAX_PICKS;
  const newest = open[0];

  // Bring a just-opened category's interests into view (they render below the grid).
  useEffect(() => {
    if (!newest) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const t = setTimeout(() => {
      document
        .getElementById(`interests-${newest}`)
        ?.scrollIntoView({
          block: "nearest",
          behavior: reduce ? "auto" : "smooth",
        });
    }, 60);
    return () => clearTimeout(t);
  }, [newest]);

  const toggle = (interest: string) =>
    onChange(
      picks.includes(interest)
        ? picks.filter((p) => p !== interest)
        : full
          ? [...picks]
          : [...picks, interest],
    );

  const custom = query.trim().slice(0, MAX_CUSTOM_LENGTH);
  const matches = searchInterests(query);
  const canAddCustom =
    custom.length >= MIN_CUSTOM_LENGTH &&
    !full &&
    ![...matches, ...picks].some(
      (m) => m.toLowerCase() === custom.toLowerCase(),
    );

  const addCustom = () => {
    if (!canAddCustom) return;
    onChange([...picks, custom]);
    setQuery("");
  };

  return (
    <div className="grid gap-5">
      <SearchField
        aria-label="Search interests or type your own"
        placeholder="Search, or type anything you want to follow"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addCustom();
          }
        }}
      />

      <AnimatePresence initial={false}>
        {picks.length ? (
          <motion.section
            key="picks"
            initial={ENTER}
            animate={SHOWN}
            exit={ENTER}
            aria-label="Your picks"
            className="grid gap-2"
          >
            <h3 className="text-mac-headline font-semibold text-mac-label-secondary">
              Your mix · {picks.length} of {MAX_PICKS}
            </h3>
            <div className="flex flex-wrap gap-2">
              {picks.map((p) => (
                <Toggle
                  key={p}
                  size="lg"
                  pressed
                  onPressedChange={() => toggle(p)}
                  aria-label={`Remove ${p}`}
                  className="data-pressed:bg-mac-accent data-pressed:text-white data-pressed:hover:bg-mac-accent/90"
                >
                  {p}
                  <XIcon />
                </Toggle>
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {query.trim() ? (
        <section aria-label="Search results" className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <Chip
                key={m}
                label={m}
                picked={picks.includes(m)}
                disabled={full}
                onToggle={toggle}
              />
            ))}
            {canAddCustom ? (
              <Toggle
                variant="outline"
                size="lg"
                pressed={false}
                onPressedChange={addCustom}
              >
                <PlusIcon />
                Add “{custom}”
              </Toggle>
            ) : null}
          </div>
          {!matches.length && !canAddCustom ? (
            <p className="text-mac-callout text-mac-label-secondary">
              {full
                ? `You can follow up to ${MAX_PICKS} interests in one daily episode.`
                : "Keep typing to add your own interest."}
            </p>
          ) : null}
        </section>
      ) : (
        <section aria-label="Browse categories" className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {INTEREST_CATEGORIES.map((c) => {
              const { Icon } = COVER_ICONS[c.icon];
              const count = c.interests.filter((i) => picks.includes(i)).length;
              return (
                <Toggle
                  key={c.id}
                  variant="outline"
                  pressed={open.includes(c.id)}
                  onPressedChange={(on) =>
                    setOpen(
                      on ? [c.id, ...open] : open.filter((o) => o !== c.id),
                    )
                  }
                  className="h-auto justify-start gap-2.5 rounded-mac-item p-2.5 text-left whitespace-normal data-pressed:text-mac-label"
                >
                  <IconTile color={c.color} size="lg">
                    <Icon />
                  </IconTile>
                  <span className="min-w-0 flex-1 font-semibold">
                    {c.label}
                  </span>
                  {count ? (
                    <span className="grid size-5 place-items-center rounded-full bg-mac-accent text-mac-caption font-semibold text-white tabular-nums">
                      {count}
                    </span>
                  ) : null}
                </Toggle>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {open.map((id) => {
              const c = INTEREST_CATEGORIES.find((x) => x.id === id);
              if (!c) return null;
              return (
                <motion.div
                  key={id}
                  id={`interests-${id}`}
                  layout
                  initial={ENTER}
                  animate={SHOWN}
                  exit={ENTER}
                  className="grid scroll-mb-6 gap-2"
                >
                  <h3 className="text-mac-headline font-semibold text-mac-label-secondary">
                    {c.label}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {c.interests.map((i) => (
                      <Chip
                        key={i}
                        label={i}
                        picked={picks.includes(i)}
                        disabled={full}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!open.length && !picks.length ? (
            <p className="text-mac-callout text-mac-label-secondary">
              Open a category to see what it covers, or search for anything
              else.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

function Chip({
  label,
  picked,
  disabled,
  onToggle,
}: {
  label: string;
  picked: boolean;
  disabled: boolean;
  onToggle: (interest: string) => void;
}) {
  return (
    <Toggle
      variant="outline"
      size="lg"
      pressed={picked}
      disabled={disabled && !picked}
      onPressedChange={() => onToggle(label)}
      className="data-pressed:bg-mac-accent data-pressed:text-white data-pressed:hover:bg-mac-accent/90"
    >
      {picked ? <CheckIcon /> : <PlusIcon />}
      {label}
    </Toggle>
  );
}

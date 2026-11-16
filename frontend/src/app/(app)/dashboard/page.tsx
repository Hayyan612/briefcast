import type React from "react";
import { Suspense } from "react";

import { LinkButton } from "@/components/link-button";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { HeadphonesIcon, PlusIcon, XIcon } from "@/components/icons";

import { auth } from "@/auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { BriefingCard } from "@/components/briefing-card";
import { BriefingDialog } from "@/components/briefing-dialog";
import { EpisodeHero } from "@/components/episode-hero";
import { EpisodesTable } from "@/components/episodes-table";
import { Onboarding } from "@/components/onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { backendJson } from "@/lib/backend";
import {
  IN_PROGRESS,
  type Briefing,
  type EpisodeSummary,
  type Voice,
} from "@/lib/types";

type Search = Promise<{ q?: string | string[]; briefing?: string | string[] }>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

async function DashboardContent({ searchParams }: { searchParams: Search }) {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/");
  const params = await searchParams;
  const q = one(params.q).toLowerCase();
  const briefingId = one(params.briefing);

  const [briefings, allEpisodes, voices] = await Promise.all([
    backendJson<Briefing[]>(session, "/briefings"),
    backendJson<EpisodeSummary[]>(session, "/episodes?limit=50"),
    backendJson<Voice[]>(session, "/voices"),
  ]);
  const selected = briefings.find((b) => b.id === briefingId);
  const episodes = allEpisodes.filter(
    (e) =>
      (!selected || e.briefing_id === selected.id) &&
      (!q || `${e.title ?? ""} ${e.topic}`.toLowerCase().includes(q)),
  );
  const latest = episodes.find((e) => e.status === "ready");
  const generating = allEpisodes.some((e) => IN_PROGRESS.includes(e.status));
  const shownBriefings = selected ? [selected] : briefings;
  if (!briefings.length) {
    return <Onboarding voices={voices} name={session.user.name} />;
  }

  return (
    <div className="grid gap-6">
      <AutoRefresh active={generating} />
      {selected || q ? (
        <div className="flex flex-wrap items-center gap-2">
          {selected ? (
            <Badge variant="secondary">Briefing: {selected.topic}</Badge>
          ) : null}
          {q ? (
            <Badge variant="secondary">Search: “{one(params.q)}”</Badge>
          ) : null}
          <LinkButton href="/dashboard" variant="ghost" size="sm">
            <XIcon data-icon="inline-start" />
            Clear
          </LinkButton>
        </div>
      ) : null}

      {latest ? <EpisodeHero episode={latest} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Episodes</h2>
            <span className="text-sm text-muted-foreground">
              {episodes.length} total
            </span>
          </div>
          <Card className=" py-2">
            <CardContent className="px-2">
              {episodes.length ? (
                <EpisodesTable episodes={episodes} />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HeadphonesIcon />
                    </EmptyMedia>
                    <EmptyTitle>
                      {q ? "No episodes match" : "Nothing to listen to yet"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {q
                        ? "Try a different search."
                        : "Use “Run now” on a briefing to hear the first episode in about two minutes."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="grid min-w-0 gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Coming up</h2>
            <BriefingDialog
              voices={voices}
              trigger={
                <Button size="sm" variant="ghost">
                  <PlusIcon data-icon="inline-start" />
                  New
                </Button>
              }
            />
          </div>
          {shownBriefings.map((b, i) => (
            <div
              key={b.id}
              className="rise min-w-0"
              style={{ "--i": i + 2 } as React.CSSProperties}
            >
              <BriefingCard briefing={b} voices={voices} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

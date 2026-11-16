import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HeadphonesIcon, PlusIcon, RadioIcon } from "lucide-react";

import { auth } from "@/auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { BriefingCard } from "@/components/briefing-card";
import { BriefingDialog } from "@/components/briefing-dialog";
import { EpisodeList } from "@/components/episode-list";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { backendJson } from "@/lib/backend";
import {
  IN_PROGRESS,
  type Briefing,
  type EpisodeSummary,
  type Voice,
} from "@/lib/types";

async function DashboardContent() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [briefings, episodes, voices] = await Promise.all([
    backendJson<Briefing[]>(session, "/briefings"),
    backendJson<EpisodeSummary[]>(session, "/episodes?limit=20"),
    backendJson<Voice[]>(session, "/voices"),
  ]);
  const generating = episodes.some((e) => IN_PROGRESS.includes(e.status));
  const newButton = (
    <Button>
      <PlusIcon data-icon="inline-start" />
      New briefing
    </Button>
  );

  return (
    <>
      <AutoRefresh active={generating} />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Your briefings
            </h1>
            <p className="text-muted-foreground">
              Each one becomes a five-minute episode, every day at its time.
            </p>
          </div>
          {briefings.length ? (
            <BriefingDialog voices={voices} trigger={newButton} />
          ) : null}
        </div>
        {briefings.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {briefings.map((b) => (
              <BriefingCard key={b.id} briefing={b} voices={voices} />
            ))}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RadioIcon />
              </EmptyMedia>
              <EmptyTitle>No briefings yet</EmptyTitle>
              <EmptyDescription>
                Create one with a topic and a daily time. You can run it right
                away to hear the first episode.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <BriefingDialog voices={voices} trigger={newButton} />
            </EmptyContent>
          </Empty>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Episodes
        </h2>
        {episodes.length ? (
          <EpisodeList episodes={episodes} />
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HeadphonesIcon />
              </EmptyMedia>
              <EmptyTitle>Nothing to listen to yet</EmptyTitle>
              <EmptyDescription>
                Episodes appear here as soon as the agent starts working on
                them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
    </>
  );
}

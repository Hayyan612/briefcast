import { connection } from "next/server";
import { Suspense } from "react";

import { LinkButton } from "@/components/link-button";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  FileTextIcon,
  SearchIcon,
  SparklesIcon,
} from "@/components/icons";

import { auth } from "@/auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { RetryButton } from "@/components/retry-button";
import { CoverArt } from "@/components/cover-art";
import { EpisodeHero } from "@/components/episode-hero";
import { StatusBadge } from "@/components/status-badge";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backendFetch } from "@/lib/backend";
import { STATUS_LABEL, STATUS_PROGRESS } from "@/lib/format";
import {
  IN_PROGRESS,
  type EpisodeDetail,
  type ResearchStep,
} from "@/lib/types";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function describeStep(step: ResearchStep): string {
  if (step.tool === "search_web") {
    const skipped = step.skipped_repeats
      ? ` · skipped ${step.skipped_repeats} already covered`
      : "";
    return `Searched “${step.query}” (${step.recency}) · ${step.hits} new results${skipped}`;
  }
  if (step.tool === "preload") {
    const parts = [];
    if (step.requested)
      parts.push(
        `${step.requested} link${step.requested === 1 ? "" : "s"} you added`,
      );
    if (step.watched)
      parts.push(
        `${step.watched} new page${step.watched === 1 ? "" : "s"} on followed sites`,
      );
    return `Read ${parts.join(" and ")}`;
  }
  if (step.tool === "read_source") return `Read ${step.source} in full`;
  if (step.tool === "finish_research")
    return `Kept ${step.findings} grounded findings`;
  return step.tool;
}

async function EpisodeContent({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // session reads are request-time; never prerender them
  const { id } = await params;
  const session = await auth();
  if (!session?.user)
    redirect(`/?callbackUrl=${encodeURIComponent(`/episodes/${id}`)}`);

  const res = await backendFetch(
    session,
    `/episodes/${encodeURIComponent(id)}`,
  );
  if (res.status === 404 || res.status === 422) notFound();
  if (!res.ok) throw new Error(`Could not load episode (${res.status})`);
  const ep = (await res.json()) as EpisodeDetail;
  const inProgress = IN_PROGRESS.includes(ep.status);
  const steps = ep.research_log?.filter((s) => s.tool) ?? [];
  const coverage = steps.find((s) => s.tool === "finish_research")?.note;

  return (
    <>
      <AutoRefresh active={inProgress} />

      {ep.status === "ready" ? (
        <EpisodeHero
          episode={ep}
          eyebrow="Episode"
          sources={ep.sources?.length ?? 0}
          showOpen={false}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <CoverArt topic={ep.topic} className="size-16" />
            <div className="grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ep.status} />
                <Badge variant="outline">
                  <LocalTime iso={ep.scheduled_for} />
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold">
                {ep.title ?? ep.topic}
              </CardTitle>
              <CardDescription>{ep.topic}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {inProgress ? (
              <div className="grid gap-2">
                <Progress value={STATUS_PROGRESS[ep.status]} />
                <p className="text-sm text-muted-foreground">
                  {STATUS_LABEL[ep.status]}… This page updates by itself. You’ll
                  also get an email when it’s ready.
                </p>
              </div>
            ) : null}
            {ep.status === "failed" ? (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>This episode could not be generated</AlertTitle>
                <AlertDescription>
                  {ep.error ?? "Unknown error"}
                </AlertDescription>
                <AlertAction>
                  <RetryButton episodeId={ep.id} />
                </AlertAction>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="script">
        <TabsList>
          <TabsTrigger value="script">
            <FileTextIcon />
            Script
          </TabsTrigger>
          <TabsTrigger value="sources">
            <BookOpenIcon />
            Sources
          </TabsTrigger>
          <TabsTrigger value="research">
            <SparklesIcon />
            Agent log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script">
          <Card>
            <CardContent className="mx-auto grid w-full max-w-[68ch] gap-5 py-2 text-[15px] leading-7 text-mac-label">
              {ep.script ? (
                ep.script.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          {ep.sources?.length ? (
            <ItemGroup className="gap-2">
              {ep.sources.map((s) => (
                <Item
                  key={s.id}
                  variant="outline"
                  render={<a href={s.url} target="_blank" rel="noreferrer" />}
                >
                  <ItemMedia variant="icon">
                    <Badge variant="secondary">{s.id}</Badge>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{s.title}</ItemTitle>
                    <ItemDescription>
                      {hostname(s.url)}
                      {s.published
                        ? ` · ${new Date(s.published).toLocaleDateString()}`
                        : ""}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sources appear once research is done.
            </p>
          )}
        </TabsContent>

        <TabsContent value="research" className="grid gap-3">
          {coverage ? (
            <Alert>
              <SparklesIcon />
              <AlertTitle>Agent’s coverage note</AlertTitle>
              <AlertDescription>{coverage}</AlertDescription>
            </Alert>
          ) : null}
          {steps.length ? (
            <ItemGroup className="gap-2">
              {steps.map((s, i) => (
                <Item key={i} size="sm" variant="muted">
                  <ItemMedia variant="icon">
                    {s.tool === "search_web" ? (
                      <SearchIcon />
                    ) : s.tool === "read_source" ? (
                      <BookOpenIcon />
                    ) : (
                      <SparklesIcon />
                    )}
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription>{describeStep(s)}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <p className="text-sm text-muted-foreground">
              The agent’s steps appear here.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function EpisodePage({ params }: PageProps<"/episodes/[id]">) {
  return (
    <>
      <div className="mx-auto grid w-full max-w-4xl gap-8">
        <LinkButton
          href="/dashboard"
          variant="ghost"
          size="sm"
          className="w-fit"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          All briefings
        </LinkButton>
        <Suspense
          fallback={
            <div className="grid gap-4">
              <Skeleton className="h-56" />
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-64" />
            </div>
          }
        >
          <EpisodeContent params={params} />
        </Suspense>
      </div>
    </>
  );
}

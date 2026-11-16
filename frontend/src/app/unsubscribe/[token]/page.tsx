import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";

import { Brand } from "@/components/brand";
import { CircleCheckIcon, MailIcon } from "@/components/icons";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { publicBackendFetch } from "@/lib/backend";

type Info = { topic: string; email_enabled: boolean };

async function Unsubscribe({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const path = `/public/unsubscribe/${encodeURIComponent(token)}`;
  const res = await publicBackendFetch(path);

  if (!res.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-mac-title-2 font-bold">
            This link doesn’t work
          </CardTitle>
          <CardDescription>
            It may have been mistyped. You can turn emails off from the briefing
            in the app.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <LinkButton href="/dashboard" variant="outline" size="lg">
            Open Briefcast
          </LinkButton>
        </CardFooter>
      </Card>
    );
  }
  const info = (await res.json()) as Info;

  // A confirm button (not a GET side effect), so link scanners in mail apps can't unsubscribe.
  async function confirm() {
    "use server";
    await publicBackendFetch(path, { method: "POST" });
    revalidatePath(`/unsubscribe/${token}`);
  }

  if (!info.email_enabled) {
    return (
      <Card>
        <CardHeader className="gap-3">
          <CircleCheckIcon className="size-8 text-mac-green" />
          <CardTitle className="text-mac-title-2 font-bold">
            Emails are off
          </CardTitle>
          <CardDescription>
            You won’t get emails for “{info.topic}”. Episodes still appear in
            the app and your podcast feed. You can turn emails back on when
            editing the briefing.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <LinkButton href="/dashboard" variant="outline" size="lg">
            Open Briefcast
          </LinkButton>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <MailIcon className="size-8 text-mac-accent" />
        <CardTitle className="text-mac-title-2 font-bold">
          Stop emails for this briefing?
        </CardTitle>
        <CardDescription>“{info.topic}”</CardDescription>
      </CardHeader>
      <CardContent className="text-mac-callout text-muted-foreground">
        The briefing keeps running. New episodes still appear in the app and in
        your podcast feed; only the emails stop.
      </CardContent>
      <CardFooter className="gap-3">
        <form action={confirm}>
          <Button type="submit" size="lg">
            Stop emails
          </Button>
        </form>
        <LinkButton href="/dashboard" variant="ghost" size="lg">
          Keep them
        </LinkButton>
      </CardFooter>
    </Card>
  );
}

export default function UnsubscribePage({
  params,
}: PageProps<"/unsubscribe/[token]">) {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-6 px-5 py-10">
      <Brand />
      <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
        <Unsubscribe params={params} />
      </Suspense>
    </main>
  );
}

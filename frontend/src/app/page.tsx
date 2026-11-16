import { connection } from "next/server";
import { Suspense } from "react";

import { LinkButton } from "@/components/link-button";
import {
  AudioLinesIcon,
  ClockIcon,
  MailIcon,
  SearchIcon,
} from "@/components/icons";

import { auth, signIn } from "@/auth";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = [
  {
    icon: ClockIcon,
    title: "Pick a topic and a time",
    text: "“Startup funding announced in the last 24 hours”, every day at 8:00.",
  },
  {
    icon: SearchIcon,
    title: "An agent does the reading",
    text: "It searches current sources, reads the key articles and keeps every fact cited.",
  },
  {
    icon: AudioLinesIcon,
    title: "Five minutes of audio",
    text: "The script is voiced with Gnani.ai text-to-speech.",
  },
  {
    icon: MailIcon,
    title: "Waiting in your inbox",
    text: "You get an email with a link the moment the episode is ready.",
  },
];

async function SignInCta({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  await connection(); // session reads are request-time; never prerender them
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const next =
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/dashboard";
  if (session?.user) {
    return (
      <LinkButton href={next} size="lg" className="w-fit">
        Open your briefings
      </LinkButton>
    );
  }
  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: next });
  }
  return (
    <form action={signInWithGoogle}>
      <Button size="lg" type="submit">
        Continue with Google
      </Button>
    </form>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
      <Brand />
      <div className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col gap-6">
          <Badge variant="secondary" className="w-fit">
            Scheduled research-to-podcast agent
          </Badge>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight md:text-[52px]">
            Your own five-minute news show, on any topic.
          </h1>
          <p className="max-w-md text-mac-title-2 text-mac-label-secondary">
            Tell Briefcast what to follow and when you want it. Every day it
            researches the topic from fresh sources, writes a script and records
            it for you.
          </p>
          <Suspense fallback={<Skeleton className="h-11 w-52" />}>
            <SignInCta searchParams={searchParams} />
          </Suspense>
        </section>
        <Card>
          <CardHeader>
            <CardTitle className="text-mac-title-2">How it works</CardTitle>
            <CardDescription>
              From a sentence to a daily episode.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent>
            <ItemGroup>
              {STEPS.map(({ icon: Icon, title, text }) => (
                <Item key={title} size="sm">
                  <ItemMedia variant="icon">
                    <Icon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{title}</ItemTitle>
                    <ItemDescription>{text}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
      <footer className="text-mac-body text-mac-label-secondary">
        <LinkButton href="/privacy" variant="link" size="sm" className="px-0">
          Privacy policy
        </LinkButton>
      </footer>
    </main>
  );
}

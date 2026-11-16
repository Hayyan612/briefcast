import { Suspense } from "react";
import Link from "next/link";
import { AudioLinesIcon, ClockIcon, MailIcon, SearchIcon } from "lucide-react";

import { auth, signIn } from "@/auth";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
      <Link
        href={next}
        className={buttonVariants({
          size: "lg",
          className: "h-11 w-fit px-5 text-base",
        })}
      >
        Open your briefings
      </Link>
    );
  }
  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: next });
  }
  return (
    <form action={signInWithGoogle}>
      <Button size="lg" type="submit" className="h-11 px-5 text-base">
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
          <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight md:text-6xl">
            Your own five-minute news show, on any topic.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
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
            <CardTitle className="font-heading text-xl">How it works</CardTitle>
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
    </main>
  );
}

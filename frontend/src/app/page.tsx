import type * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { auth, signIn } from "@/auth";
import { BrandMark } from "@/components/brand";
import { Faq } from "@/components/landing/faq";
import { Morning } from "@/components/landing/morning";
import { Landscape, SkyClock } from "@/components/landing/landscape";
import { depth } from "@/components/landing/depth";
import { Scene } from "@/components/landing/scene";
import { SamplePlayer } from "@/components/landing/sample-player";
import { FeatureSection, Shot, TwoTone } from "@/components/landing/sections";
import { LinkButton } from "@/components/link-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LANGUAGES } from "@/lib/languages";

async function SignInCta({
  searchParams,
  size = "lg",
}: {
  searchParams: PageProps<"/">["searchParams"];
  size?: "default" | "lg";
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
      <LinkButton href={next} size={size} className="w-fit rounded-full">
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
      <Button size={size} type="submit" className="rounded-full">
        Continue with Google
      </Button>
    </form>
  );
}

const FAQ = [
  {
    q: "How long is an episode?",
    a: "About five minutes. Long enough for the important stories of the day, short enough for a coffee or a commute.",
  },
  {
    q: "When does it arrive?",
    a: "Every day at the time you choose, in your own time zone. You get an email with a link when it is ready, and you can also make an episode on demand.",
  },
  {
    q: "Where does the news come from?",
    a: "An AI agent searches the web, reads the full articles that matter and cites every one of them, so you can check any claim. You can favour sites you trust, block others, follow specific pages and add links you want covered.",
  },
  {
    q: "Will it repeat yesterday’s stories?",
    a: "No. It remembers what recent episodes covered and skips stories you have already heard, unless there is something new to say about them.",
  },
  {
    q: "Which languages does it speak?",
    a: `${LANGUAGES.map((l) => l.label).join(", ")}. Research reads sources in English; the episode is written and spoken in the language you pick, with Gnani.ai voices.`,
  },
  {
    q: "Can I listen in my podcast app?",
    a: "Yes. Each account has a private feed address you can add to any podcast app that accepts one, with artwork for every briefing.",
  },
  {
    q: "Who can see my briefings?",
    a: (
      <>
        Only you. You sign in with Google, and Briefcast keeps your name and
        email address to send your episodes. Read the{" "}
        <Link
          href="/privacy"
          className="text-mac-link underline-offset-2 hover:underline"
        >
          privacy policy
        </Link>
        .
      </>
    ),
  },
];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex min-h-full flex-col bg-mac-window">
      <header className="sticky top-0 z-40 border-b border-mac-separator/60 bg-mac-window/75 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Briefcast home"
          >
            <BrandMark className="size-9" />
            <span className="text-mac-title-2 font-semibold tracking-[-0.02em]">
              Briefcast
            </span>
          </Link>
          <div className="flex items-center gap-1 md:gap-5">
            <a
              href="#how"
              className="text-mac-body text-mac-label-secondary hover:text-mac-label max-md:hidden"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="text-mac-body text-mac-label-secondary hover:text-mac-label max-md:hidden"
            >
              Questions
            </a>
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="h-7 w-40 rounded-full" />}>
              <SignInCta searchParams={searchParams} size="default" />
            </Suspense>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-28 pb-24 md:gap-40">
        <div className="grid gap-12 md:gap-16">
          <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-14 md:px-8 md:pt-20">
            <span
              className="rise w-fit rounded-full bg-mac-fill-tertiary px-3 py-1 text-mac-callout font-medium text-mac-label-secondary"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              Gnani.ai voices in 11 languages
            </span>
            <TwoTone
              as="h1"
              lead="Wake up to your own news podcast."
              rest="Researched, cited and read to you in five minutes."
              className="rise max-w-[21ch] text-[40px] leading-[1.08] md:text-[64px] md:leading-[1.04]"
              style={{ "--i": 1 } as React.CSSProperties}
            />
            <div
              className="rise flex flex-wrap items-center gap-x-5 gap-y-3"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <Suspense
                fallback={<Skeleton className="h-9 w-52 rounded-full" />}
              >
                <SignInCta searchParams={searchParams} />
              </Suspense>
              <p className="text-mac-body text-mac-label-secondary">
                Pick what you follow and when. Nothing to install.
              </p>
            </div>
          </section>

          <section
            aria-label="Product preview"
            className="rise mx-auto grid w-full max-w-6xl gap-4 px-4 md:px-8"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <Scene className="relative isolate overflow-hidden rounded-[28px] ring-1 ring-black/5 md:aspect-[16/9] dark:ring-white/10">
              <div className="absolute -inset-4 -z-10" style={depth(-8, -6)}>
                <Landscape />
              </div>
              <div
                className="absolute top-[8%] left-[4%] hidden w-[68%] overflow-hidden rounded-[12px] shadow-[0_40px_90px_-30px_rgb(10_20_60/0.65)] ring-1 ring-black/10 md:block dark:ring-white/15"
                style={depth(-14, -10)}
              >
                <Image
                  src="/landing/dashboard-light.jpg"
                  alt="The Briefcast dashboard with an episode playing and its live caption"
                  width={1438}
                  height={748}
                  sizes="(min-width: 1152px) 760px, 68vw"
                  priority
                  className="block h-auto w-full dark:hidden"
                />
                <Image
                  src="/landing/dashboard-dark.jpg"
                  alt="The Briefcast dashboard in dark mode"
                  width={1438}
                  height={748}
                  sizes="(min-width: 1152px) 760px, 68vw"
                  className="hidden h-auto w-full dark:block"
                />
              </div>
              <div
                className="p-4 pt-28 md:absolute md:right-[4%] md:bottom-[7%] md:w-[380px] md:p-0"
                style={depth(18, 12)}
              >
                <SamplePlayer />
              </div>
              <SkyClock className="absolute bottom-[6%] left-[4%] max-md:top-4 max-md:bottom-auto max-md:left-4 dark:hidden" />
            </Scene>
            <p className="text-mac-body text-mac-label-secondary">
              Press play to hear two real Briefcast episodes, in English and
              Hindi. The words follow the voice.
            </p>
          </section>
        </div>

        <FeatureSection
          id="how"
          lead="Research, write, record."
          rest="Every claim traced to its source."
        >
          <Morning />
          <Shot
            src="/landing/agent-log.jpg"
            alt="The agent log: the agent's note on what it could and could not verify, then its searches and the pages it read in full"
            width={898}
            height={400}
            inset
            caption="The agent keeps its working: what it searched, what it read, and what it could not verify, so you know how solid each story is."
          />
          <Shot
            src="/landing/sources.jpg"
            alt="The list of sources cited in an episode, with publishers and dates"
            width={898}
            height={400}
            inset
            caption="Every source behind an episode, with publisher and date, one tap away."
          />
        </FeatureSection>

        <FeatureSection
          id="yours"
          lead="Follow anything."
          rest="Fifteen categories, or type your own."
        >
          <Shot
            src="/landing/onboarding-interests.jpg"
            alt="Choosing interests: category tiles and selected topics such as Indian startup funding and Cricket"
            width={578}
            height={594}
            caption="Mix up to six interests into one daily episode, from startups and markets to cricket and your city."
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <Shot
              src="/landing/onboarding-sources.jpg"
              alt="Choosing a region and how fresh the news should be"
              width={578}
              height={376}
              caption="Choose where the news comes from: local outlets first, or a global view."
            />
            <Shot
              src="/landing/onboarding-schedule.jpg"
              alt="Choosing the delivery time, time zone, language and voice"
              width={578}
              height={394}
              caption="Pick the time it arrives, the language and the voice."
            />
          </div>
        </FeatureSection>

        <FeatureSection
          id="listen"
          lead="Listen your way."
          rest="Read along, get an email, or subscribe."
        >
          <Shot
            src="/landing/now-playing.jpg"
            alt="Now Playing with a lyrics-style transcript, the current line highlighted"
            width={1438}
            height={748}
            caption="The words follow the voice, like lyrics. Tap any line to jump there."
          />
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Shot
              src="/landing/email.jpg"
              alt="The email you get when a new episode is ready"
              width={560}
              height={356}
              caption="An email the moment each episode is ready. Or add your private feed to any podcast app."
            />
            <Shot
              src="/landing/mobile-now-playing.jpg"
              alt="Now Playing on a phone, with the transcript filling the screen"
              width={390}
              height={740}
              phone
            />
          </div>
        </FeatureSection>

        <section className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <TwoTone
            as="p"
            lead="Speaks"
            rest={
              <>
                {LANGUAGES.map((l, i) => (
                  <span key={l.code}>
                    <span
                      lang={
                        l.native !== l.label ? l.code.split("-")[0] : undefined
                      }
                    >
                      {l.native}
                    </span>
                    {i < LANGUAGES.length - 2
                      ? ", "
                      : i === LANGUAGES.length - 2
                        ? " and "
                        : "."}
                  </span>
                ))}
              </>
            }
            className="max-w-[24ch]"
          />
        </section>

        <section
          id="faq"
          className="mx-auto grid w-full max-w-6xl scroll-mt-24 gap-10 px-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:px-8"
        >
          <TwoTone
            lead="Questions."
            rest="Straight answers."
            className="md:sticky md:top-28 md:-mt-2.5 md:self-start"
          />
          <Faq items={FAQ} />
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 md:px-8">
          <TwoTone
            lead="Tomorrow at 8:00, your first episode."
            rest="Set it up in a minute."
            className="max-w-[18ch]"
          />
          <Suspense fallback={<Skeleton className="h-9 w-52 rounded-full" />}>
            <SignInCta searchParams={searchParams} />
          </Suspense>
        </section>
      </main>

      <footer className="border-t border-mac-separator">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-mac-body text-mac-label-secondary md:px-8">
          <span>Built by Hayyan Hajwani in Mumbai.</span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>
              Voices by{" "}
              <a
                href="https://gnani.ai"
                className="text-mac-label hover:underline"
              >
                Gnani.ai
              </a>
            </span>
            <span>
              Search by{" "}
              <a
                href="https://tavily.com"
                className="text-mac-label hover:underline"
              >
                Tavily
              </a>
            </span>
            <Link href="/privacy" className="hover:text-mac-label">
              Privacy policy
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

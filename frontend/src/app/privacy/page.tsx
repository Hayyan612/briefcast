import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Privacy · Briefcast" };

const SECTIONS = [
  {
    title: "What we collect",
    body: "When you sign in with Google we receive your name, email address and profile picture. We store the briefings you create (topic, time, timezone, voice) and the episodes generated for them.",
  },
  {
    title: "How we use it",
    body: "Your email is used to sign you in and to send you a link when an episode is ready. Your topics are sent to our research and language-model providers (Tavily, OpenRouter) to produce the script, and the script is sent to Gnani.ai to synthesise audio. Nothing is sold or used for advertising.",
  },
  {
    title: "Analytics",
    body: "We count visits and a few actions (such as playing the sample or finishing setup) with Umami, which we host ourselves at stats.hayyan.space. It uses no cookies, and these counts never include your name, email or topics.",
  },
  {
    title: "Who can see it",
    body: "Only you can see your briefings and episodes. Every request is checked against your account.",
  },
  {
    title: "Deleting your data",
    body: "Deleting a briefing deletes all of its episodes and audio. To delete your account entirely, email hayyan.connect@gmail.com.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8">
      <Brand />
      <Card>
        <CardHeader>
          <CardTitle className="text-mac-large-title">Privacy policy</CardTitle>
          <CardDescription>
            Briefcast is a demo project. Last updated 16 November 2026.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-5">
          {SECTIONS.map((s) => (
            <section key={s.title} className="grid gap-1">
              <h2 className="font-medium">{s.title}</h2>
              <p className="text-mac-label-secondary">{s.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

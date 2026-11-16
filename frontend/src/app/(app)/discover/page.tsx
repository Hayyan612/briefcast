import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/auth";
import { DiscoverBrowser } from "@/components/discover-browser";
import { Skeleton } from "@/components/ui/skeleton";
import { backendJson } from "@/lib/backend";
import type { Briefing, Voice } from "@/lib/types";

export const metadata = { title: "Discover · Briefcast" };

async function DiscoverContent() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/");
  const [briefings, voices] = await Promise.all([
    backendJson<Briefing[]>(session, "/briefings"),
    backendJson<Voice[]>(session, "/voices"),
  ]);
  return <DiscoverBrowser briefings={briefings} voices={voices} />;
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6">
          <Skeleton className="h-24 rounded-mac-card" />
          <Skeleton className="h-96 rounded-mac-card" />
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}

import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import { AppSidebar, AppSidebarSkeleton } from "@/components/app-sidebar";
import { PlayerBar, PlayerSpacer } from "@/components/player/player-bar";
import { PlayerProvider } from "@/components/player/player-provider";
import { TopBar } from "@/components/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The sidebar provider and the sidebar render inside one Suspense boundary, so they
 * hydrate together. (Split across boundaries, the provider would already know it is
 * on a phone while the sidebar still hydrates the desktop markup.)
 */
function Shell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset className="bg-transparent">
        <TopBar />
        <div className="flex-1 px-4 pt-6 pb-8 md:px-6">{children}</div>
        <PlayerSpacer />
      </SidebarInset>
      <PlayerBar />
    </SidebarProvider>
  );
}

async function SignedInShell({ children }: { children: ReactNode }) {
  await connection(); // reads the session, so it renders per request
  return <Shell sidebar={<AppSidebar />}>{children}</Shell>;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <PlayerProvider>
      <Suspense
        fallback={
          <Shell sidebar={<AppSidebarSkeleton />}>
            <div className="grid gap-6">
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          </Shell>
        }
      >
        <SignedInShell>{children}</SignedInShell>
      </Suspense>
    </PlayerProvider>
  );
}

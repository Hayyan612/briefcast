import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import { signOut } from "@/auth";
import {
  DesktopSidebar,
  getSidebarData,
  SidebarNav,
  SidebarSkeleton,
} from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { PlayerBar } from "@/components/player/player-bar";
import { PlayerProvider } from "@/components/player/player-provider";
import { SearchBox } from "@/components/search-box";
import { UserMenu } from "@/components/user-menu";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Window,
  WindowContent,
  WindowTitle,
  WindowTitlebar,
} from "@/components/ui/window";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/**
 * The whole signed-in app is one macOS window: source list on the left, a toolbar
 * with search, scrolling content, and the player docked along the bottom edge.
 * On phones the window fills the screen and the source list moves into a sheet.
 */
function Shell({
  sidebar,
  mobileNav,
  account,
  children,
}: {
  sidebar: ReactNode;
  mobileNav?: ReactNode;
  account?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-[#e5e5ea] md:p-4">
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-mac-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SidebarProvider className="contents">
        <Window className="size-full max-md:rounded-none max-md:shadow-none">
          {sidebar}
          <WindowTitlebar className="h-13 gap-3 px-4 md:px-5">
            {mobileNav}
            <WindowTitle className="pointer-events-auto static inset-auto min-w-0 flex-1 text-left text-mac-headline max-sm:sr-only">
              Briefcast
            </WindowTitle>
            <div className="flex shrink-0 items-center gap-3 max-sm:flex-1">
              <Suspense fallback={<Skeleton className="h-8 w-72 rounded-md" />}>
                <SearchBox />
              </Suspense>
              {account}
            </div>
          </WindowTitlebar>
          <WindowContent
            id="content"
            role="main"
            tabIndex={-1}
            className="overflow-y-auto px-5 py-6 outline-none md:px-10 md:py-8"
          >
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </WindowContent>
          <PlayerBar />
        </Window>
      </SidebarProvider>
    </div>
  );
}

async function SignedInShell({ children }: { children: ReactNode }) {
  await connection(); // reads the session, so it renders per request
  const data = await getSidebarData();
  if (!data) return <Shell sidebar={<SidebarSkeleton />}>{children}</Shell>;
  const { session, briefings, voices } = data;
  return (
    <Shell
      sidebar={<DesktopSidebar briefings={briefings} voices={voices} />}
      mobileNav={
        <Suspense fallback={null}>
          <MobileNav>
            <SidebarNav briefings={briefings} voices={voices} />
          </MobileNav>
        </Suspense>
      }
      account={
        <UserMenu
          name={session.user?.name}
          email={session.user?.email}
          image={session.user?.image}
          signOutAction={signOutAction}
        />
      }
    >
      {children}
    </Shell>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <PlayerProvider>
      <Suspense
        fallback={
          <Shell sidebar={<SidebarSkeleton />}>
            <div className="grid gap-4">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </Shell>
        }
      >
        <SignedInShell>{children}</SignedInShell>
      </Suspense>
    </PlayerProvider>
  );
}

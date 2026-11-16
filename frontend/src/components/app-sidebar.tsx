import Link from "next/link";

import { auth } from "@/auth";
import { BriefingDialog } from "@/components/briefing-dialog";
import { CoverArt } from "@/components/cover-art";
import { HomeIcon, PlusIcon } from "@/components/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { WindowControls } from "@/components/ui/window";
import { backendJson } from "@/lib/backend";
import { formatTime } from "@/lib/format";
import type { Briefing, Voice } from "@/lib/types";

export async function getSidebarData() {
  const session = await auth();
  if (!session?.user) return null;
  const [briefings, voices] = await Promise.all([
    backendJson<Briefing[]>(session, "/briefings"),
    backendJson<Voice[]>(session, "/voices"),
  ]);
  return { session, briefings, voices };
}

/** Source-list content shared by the desktop sidebar and the phone sheet. */
export function SidebarNav({
  briefings,
  voices,
}: {
  briefings: Briefing[];
  voices: Voice[];
}) {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/dashboard" />}>
              <HomeIcon />
              Home
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Briefings</SidebarGroupLabel>
        <BriefingDialog
          voices={voices}
          trigger={
            <SidebarGroupAction aria-label="New briefing">
              <PlusIcon />
            </SidebarGroupAction>
          }
        />
        <SidebarGroupContent>
          <SidebarMenu>
            {briefings.map((b) => (
              <SidebarMenuItem key={b.id}>
                <SidebarMenuButton
                  size="lg"
                  render={<Link href={`/dashboard?briefing=${b.id}`} />}
                >
                  <CoverArt topic={b.topic} className="size-8" />
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate">{b.topic}</span>
                    <span className="truncate text-mac-footnote text-muted-foreground">
                      {b.is_active
                        ? `Daily at ${formatTime(b.delivery_time)}`
                        : "Paused"}
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

/** Desktop source list. The Window lays out any child with data-slot="mac-sidebar". */
export function DesktopSidebar(props: {
  briefings: Briefing[];
  voices: Voice[];
}) {
  return (
    <Sidebar
      collapsible="none"
      data-slot="mac-sidebar"
      className="hidden w-60 bg-transparent md:flex"
    >
      <div data-window-drag-region className="flex h-12 shrink-0 items-center px-4">
        <WindowControls />
      </div>
      <SidebarNav {...props} />
    </Sidebar>
  );
}

export function SidebarSkeleton() {
  return (
    <Sidebar
      collapsible="none"
      data-slot="mac-sidebar"
      className="hidden w-60 bg-transparent pt-12 md:flex"
    >
      <div className="grid gap-2 p-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex h-10 items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    </Sidebar>
  );
}

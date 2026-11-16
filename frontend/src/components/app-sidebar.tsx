import Link from "next/link";
import { HomeIcon, PlusIcon } from "@/components/icons";

import { auth, signOut } from "@/auth";
import { BriefingDialog } from "@/components/briefing-dialog";
import { Brand } from "@/components/brand";
import { CoverArt } from "@/components/cover-art";
import { UserMenu } from "@/components/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { backendJson } from "@/lib/backend";
import { formatTime } from "@/lib/format";
import type { Briefing, Voice } from "@/lib/types";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function AppSidebar() {
  const session = await auth();
  if (!session?.user) return null;
  const [briefings, voices] = await Promise.all([
    backendJson<Briefing[]>(session, "/briefings"),
    backendJson<Voice[]>(session, "/voices"),
  ]);

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="p-3">
        <Brand />
      </SidebarHeader>
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
          <SidebarGroupLabel>
            Your briefings ({briefings.length})
          </SidebarGroupLabel>
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
                    <CoverArt topic={b.topic} className="size-9" />
                    <span className="grid min-w-0 leading-tight">
                      <span className="truncate font-medium">{b.topic}</span>
                      <span className="truncate text-xs text-muted-foreground">
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
      <SidebarFooter>
        <UserMenu
          name={session.user.name}
          email={session.user.email}
          image={session.user.image}
          signOutAction={signOutAction}
          variant="sidebar"
        />
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar variant="floating">
      <SidebarHeader className="p-3">
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {Array.from({ length: 5 }, (_, i) => (
              <SidebarMenuItem key={i}>
                <div className="flex h-12 items-center gap-2 px-2">
                  <Skeleton className="size-9 rounded-lg" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

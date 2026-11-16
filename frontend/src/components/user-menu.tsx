"use client";

import { ChevronsUpDownIcon, LogOutIcon } from "@/components/icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface Props {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  signOutAction: () => Promise<void>;
  variant?: "icon" | "sidebar";
}

export function UserMenu({
  name,
  email,
  image,
  signOutAction,
  variant = "icon",
}: Props) {
  const initials = (name ?? email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatar = (
    <Avatar className="size-8">
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
  const content = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuGroup>
        <DropdownMenuLabel>
          <div className="font-medium text-foreground">{name}</div>
          <div className="truncate text-xs font-normal">{email}</div>
        </DropdownMenuLabel>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => void signOutAction()}>
        <LogOutIcon />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (variant === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
              {avatar}
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </span>
              <ChevronsUpDownIcon className="ml-auto" />
            </DropdownMenuTrigger>
            {content}
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-8 shrink-0 rounded-full p-0"
            aria-label="Account menu"
          />
        }
      >
        {avatar}
      </DropdownMenuTrigger>
      {content}
    </DropdownMenu>
  );
}

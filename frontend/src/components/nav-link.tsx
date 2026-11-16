"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { SidebarMenuButton } from "@/components/ui/sidebar";

/**
 * Sidebar link that knows whether it is the current view. The selection pill shares
 * one layoutId, so it glides between items instead of jumping.
 */
export function NavLink({
  href,
  briefingId,
  size,
  children,
}: {
  href: string;
  briefingId?: string;
  size?: "default" | "lg";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = useSearchParams().get("briefing");
  const active = briefingId
    ? pathname === "/dashboard" && current === briefingId
    : pathname === href && !current;

  return (
    <SidebarMenuButton
      size={size}
      isActive={active}
      aria-current={active ? "page" : undefined}
      className="relative isolate data-active:bg-transparent"
      render={<Link href={href} />}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-selection"
          aria-hidden
          className="absolute inset-0 -z-10 rounded-mac-item bg-mac-fill-primary"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      ) : null}
      {children}
    </SidebarMenuButton>
  );
}

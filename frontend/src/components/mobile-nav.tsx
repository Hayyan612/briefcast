"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { BrandMark } from "@/components/brand";
import { SidebarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Phone navigation: the same source list, in a sheet that closes after navigating. */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [route, setRoute] = useState(pathname + search);
  if (route !== pathname + search) {
    setRoute(pathname + search);
    setOpen(false);
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <SidebarIcon />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-2 p-0">
        <div className="flex h-14 shrink-0 items-center border-b px-5 pr-14">
          <SheetTitle className="flex items-center gap-2 text-mac-headline font-semibold">
            <BrandMark className="size-6" />
            Briefcast
          </SheetTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

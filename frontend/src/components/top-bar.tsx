import { Suspense } from "react";

import { SearchBox } from "@/components/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-md md:px-6">
      <SidebarTrigger className="text-foreground" />
      <Suspense
        fallback={<Skeleton className="h-11 w-full max-w-xl rounded-full" />}
      >
        <SearchBox />
      </Suspense>
    </header>
  );
}

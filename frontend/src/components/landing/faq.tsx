"use client";

import type { ReactNode } from "react";

import { PlusIcon } from "@/components/icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-mac-separator border-y border-mac-separator">
      {items.map(({ q, a }) => (
        <Collapsible key={q}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-mac-title-2 font-medium outline-offset-4 focus-visible:outline-2 focus-visible:outline-mac-accent md:text-[20px]">
            {q}
            <PlusIcon className="size-5 shrink-0 text-mac-label-secondary transition-transform duration-200 group-data-[panel-open]:rotate-45" />
          </CollapsibleTrigger>
          <CollapsibleContent className="max-w-[62ch] pb-6 text-mac-title-3 leading-relaxed text-mac-label-secondary">
            {a}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

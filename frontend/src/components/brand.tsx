import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** The Briefcast app icon, in its light or dark appearance to match the theme. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-8 shrink-0", className)}>
      <Image
        src="/brand/mark.svg"
        alt=""
        fill
        unoptimized
        className="dark:hidden"
      />
      <Image
        src="/brand/mark-dark.svg"
        alt=""
        fill
        unoptimized
        className="hidden dark:block"
      />
    </span>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5"
      aria-label="Briefcast home"
    >
      <BrandMark />
      <span className="text-mac-title-2 font-semibold tracking-[-0.02em]">
        Briefcast
      </span>
    </Link>
  );
}

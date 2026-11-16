import Image from "next/image";
import type * as React from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Monocle-style two-tone statement: a bright lead, then a dimmer line that explains it. */
export function TwoTone({
  lead,
  rest,
  as: Tag = "h2",
  className,
  style,
}: {
  lead: ReactNode;
  rest?: ReactNode;
  as?: "h1" | "h2" | "p";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      style={style}
      className={cn(
        "text-[32px] leading-[1.12] font-semibold tracking-[-0.025em] text-balance md:text-[44px]",
        className,
      )}
    >
      <span className="text-mac-label">{lead}</span>
      {rest ? <span className="text-mac-label-secondary"> {rest}</span> : null}
    </Tag>
  );
}

/** A section whose statement stays in view while real product screens scroll past. */
export function FeatureSection({
  id,
  lead,
  rest,
  children,
}: {
  id: string;
  lead: ReactNode;
  rest: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="mx-auto grid w-full max-w-6xl scroll-mt-24 gap-10 px-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:px-8"
    >
      {/* Pulled up so the first line's cap height, not its line box, meets the top of the
          first card. */}
      <div className="md:sticky md:top-28 md:-mt-2.5 md:self-start">
        <TwoTone lead={lead} rest={rest} />
      </div>
      <div className="grid gap-8">{children}</div>
    </section>
  );
}

/** A real screenshot of the app, framed like a window or a phone. */
export function Shot({
  src,
  alt,
  width,
  height,
  caption,
  phone = false,
  inset = false,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: ReactNode;
  phone?: boolean;
  /** Pad a crop of the app's content so it does not run into the frame edge. */
  inset?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={cn("grid gap-3", phone && "justify-items-center", className)}
    >
      <div
        className={cn(
          "overflow-hidden bg-mac-window ring-1 ring-black/10 dark:ring-white/10",
          "shadow-[0_24px_60px_-28px_rgb(10_20_60/0.45)]",
          phone
            ? "w-full max-w-[300px] rounded-[36px] border-[6px] border-[#1d1d1f]"
            : "rounded-[14px]",
          inset && "p-3 md:p-4",
        )}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={phone ? "300px" : "(min-width: 768px) 640px, 100vw"}
          className="block h-auto w-full"
        />
      </div>
      {caption ? (
        <figcaption className="text-mac-callout text-mac-label-secondary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

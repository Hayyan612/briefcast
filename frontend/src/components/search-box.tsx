"use client";

import { useEffect, useRef } from "react";
import Form from "next/form";
import { useSearchParams } from "next/navigation";

import { SearchIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

/** Submits to /dashboard?q=… (shareable, server-rendered). ⌘K / Ctrl+K focuses it. */
export function SearchBox() {
  const ref = useRef<HTMLInputElement>(null);
  const q = useSearchParams().get("q") ?? "";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Form
      action="/dashboard"
      role="search"
      className="relative w-full max-w-xl"
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-foreground/70" />
      <Input
        ref={ref}
        key={q}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search episodes and topics"
        aria-label="Search episodes and topics"
        className="h-11 rounded-full border-input bg-card pr-14 pl-10 text-[15px] shadow-xs placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/25"
      />
      <Kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex">
        ⌘K
      </Kbd>
    </Form>
  );
}

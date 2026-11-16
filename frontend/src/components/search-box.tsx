"use client";

import { useEffect, useRef } from "react";
import Form from "next/form";
import { useSearchParams } from "next/navigation";

import { SearchField } from "@/components/ui/search-field";

/** Toolbar search. Submits to /dashboard?q=… ; ⌘K / Ctrl+K focuses it. */
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
    <Form action="/dashboard" role="search" className="w-72 max-sm:w-full">
      <SearchField
        ref={ref}
        key={q}
        name="q"
        size="lg"
        variant="filled"
        defaultValue={q}
        placeholder="Search episodes"
        aria-label="Search episodes and topics"
        className="h-8 w-full"
      />
    </Form>
  );
}

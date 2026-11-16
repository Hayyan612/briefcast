"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { MoonIcon, SunIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

const noop = () => () => {};

/** Light/dark switch for pages without the account menu (the landing page). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser; render a stable placeholder until then.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      data-umami-event="theme_toggle"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

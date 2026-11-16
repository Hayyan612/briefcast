"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/** One easing language for the app; transforms are dropped for "reduce motion" users. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
    >
      {children}
    </MotionConfig>
  );
}

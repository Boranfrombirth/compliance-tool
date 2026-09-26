"use client";

import { MotionConfig } from "framer-motion";

// Framer Motion honours the OS reduced-motion setting app-wide.
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CheckState } from "@/lib/scoring/score";

const NEXT: Record<CheckState, CheckState> = {
  unanswered: "met",
  met: "not_met",
  not_met: "unanswered",
};

const STATE_LABEL: Record<CheckState, string> = {
  unanswered: "not answered",
  met: "met",
  not_met: "not met",
};

interface CheckToggleProps {
  state: CheckState;
  onChange?: (next: CheckState) => void;
  /** Check label, used for the accessible name. */
  label: string;
  size?: number;
  disabled?: boolean;
}

// Circular selector that cycles unanswered → met (gold) → not met (amber) → unanswered.
export default function CheckToggle({ state, onChange, label, size = 28, disabled }: CheckToggleProps) {
  const color = state === "met" ? "var(--accent)" : state === "not_met" ? "var(--amber)" : "var(--neutral)";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(NEXT[state])}
      aria-label={`${label}: ${STATE_LABEL[state]}. Activate to change.`}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed"
      style={{ width: size, height: size }}
    >
      {/* Outer ring */}
      <motion.span
        className="absolute inset-0 rounded-full border-[1.5px]"
        initial={false}
        animate={{
          borderColor: color,
          boxShadow: state === "met" ? "0 0 14px rgba(201,169,110,0.35)" : "0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
      <AnimatePresence initial={false}>
        {state === "met" && (
          // Gold fill grows from the centre.
          <motion.span
            key="met"
            className="absolute inset-[3px] flex items-center justify-center rounded-full bg-accent"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg viewBox="0 0 16 16" className="h-1/2 w-1/2" aria-hidden>
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="var(--bg)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        )}
        {state === "not_met" && (
          <motion.span
            key="not_met"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <span className="h-[1.5px] w-2/5 rounded-full bg-amber" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

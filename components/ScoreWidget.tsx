"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import ProgressRing from "./ProgressRing";

interface ScoreWidgetProps {
  secured: number;
  running: number | null;
  nonCompliant: boolean;
  /** Number of complete stages; the widget pulses once when it goes up. */
  completedStages: number;
}

// Fixed bottom-right live score. Large frosted ring on desktop, a pill on phones.
export default function ScoreWidget({ secured, running, nonCompliant, completedStages }: ScoreWidgetProps) {
  const controls = useAnimationControls();
  const prev = useRef(completedStages);

  useEffect(() => {
    if (completedStages > prev.current) {
      controls.start({
        scale: [1, 1.04, 1],
        boxShadow: [
          "0 0 0 0 rgba(201,169,110,0)",
          "0 0 0 10px rgba(201,169,110,0.12)",
          "0 0 0 0 rgba(201,169,110,0)",
        ],
        transition: { duration: 0.7, ease: "easeOut" },
      });
    }
    prev.current = completedStages;
  }, [completedStages, controls]);

  const tone = nonCompliant ? "amber" : "accent";
  const runningText = running === null ? "—" : `${Math.round(running)}%`;

  return (
    <motion.aside
      animate={controls}
      aria-label="Live compliance score"
      aria-live="polite"
      className="panel fixed bottom-4 right-4 z-30 rounded-full sm:bottom-6 sm:right-6 sm:rounded-2xl"
    >
      {/* Phone pill */}
      <div className="flex items-center gap-3 py-1.5 pl-1.5 pr-4 sm:hidden">
        <ProgressRing value={secured} size={36} tone={tone} showValue={false} label="Secured" />
        <div className="num text-sm leading-tight">
          {Math.round(secured)}%
          <span className="block text-[10px] text-muted">{runningText} running</span>
        </div>
      </div>

      {/* Desktop card */}
      <div className="hidden flex-col items-center gap-2 p-5 sm:flex">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">Secured</span>
        <ProgressRing value={secured} size={112} tone={tone} label="Secured">
          <span className="num mt-1 text-[10px] text-muted">{runningText} running</span>
        </ProgressRing>
        {nonCompliant && (
          <span className="text-[10px] uppercase tracking-[0.15em] text-amber">Non-compliant</span>
        )}
      </div>
    </motion.aside>
  );
}

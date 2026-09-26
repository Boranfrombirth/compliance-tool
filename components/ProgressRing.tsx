"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

interface ProgressRingProps {
  /** 0 to 100. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** Arc colour: gold by default, amber for a non-compliant result. */
  tone?: "accent" | "amber";
  /** Show the percentage in the centre. */
  showValue?: boolean;
  /** Extra content under the percentage (e.g. running score). */
  children?: React.ReactNode;
  className?: string;
  label?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ProgressRing({
  value,
  size = 48,
  strokeWidth = 3,
  tone = "accent",
  showValue = true,
  children,
  className = "",
  label,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const reduce = useReducedMotion();

  // Count the number up/down in step with the arc.
  const count = useMotionValue(clamped);
  const rounded = useTransform(count, (v) => Math.round(v).toString());
  useEffect(() => {
    if (reduce) {
      count.set(clamped);
      return;
    }
    const controls = animate(count, clamped, { duration: 0.6, ease: EASE });
    return () => controls.stop();
  }, [clamped, count, reduce]);

  const fontSize = Math.max(10, Math.round(size * 0.24));

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ? `${label}: ` : ""}${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--neutral)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone === "amber" ? "var(--amber)" : "var(--accent)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: clamped / 100, opacity: clamped > 0 ? 1 : 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </svg>
      {(showValue || children) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          {showValue && (
            <span className="num text-text" style={{ fontSize }}>
              <motion.span>{rounded}</motion.span>
              <span className="text-muted" style={{ fontSize: fontSize * 0.55 }}>%</span>
            </span>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

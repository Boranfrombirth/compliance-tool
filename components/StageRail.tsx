"use client";

import { motion } from "framer-motion";
import ProgressRing from "./ProgressRing";

export interface RailStage {
  id: string;
  name: string;
  score: number;
  complete: boolean;
  hasBreach: boolean;
}

interface StageRailProps {
  stages: RailStage[];
  active: number;
  /** Whether stage i can be opened (earlier stages, or the next one after completed stages). */
  canOpen: (i: number) => boolean;
  onSelect: (i: number) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

// Four nodes joined by a hairline that fills with gold as stages complete.
export default function StageRail({ stages, active, canOpen, onSelect }: StageRailProps) {
  // Line fills up to the last node of the leading run of complete stages.
  let completeRun = 0;
  while (completeRun < stages.length && stages[completeRun].complete) completeRun++;
  const fill = stages.length > 1 ? Math.min(completeRun, stages.length - 1) / (stages.length - 1) : 0;

  return (
    <>
      {/* Desktop / tablet */}
      <nav aria-label="Trade stages" className="relative hidden sm:block">
        <div className="absolute left-[12.5%] right-[12.5%] top-6 h-px bg-border" aria-hidden>
          <motion.div
            className="h-full origin-left bg-accent"
            initial={false}
            animate={{ scaleX: fill }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
          {stages.map((s, i) => {
            const isActive = i === active;
            const enabled = canOpen(i);
            return (
              <li key={s.id} className="flex justify-center">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => onSelect(i)}
                  aria-current={isActive ? "step" : undefined}
                  className="group flex flex-col items-center gap-2 rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed"
                >
                  <span
                    className={`rounded-full bg-bg p-0.5 transition ${
                      isActive ? "shadow-[0_0_0_1px_var(--accent)]" : ""
                    }`}
                  >
                    <ProgressRing
                      value={s.score}
                      size={44}
                      tone={s.hasBreach && s.complete ? "amber" : "accent"}
                      label={s.name}
                    />
                  </span>
                  <span
                    className={`max-w-[10rem] text-center text-xs leading-tight transition ${
                      isActive ? "text-text" : enabled ? "text-muted group-hover:text-text" : "text-muted/50"
                    }`}
                  >
                    {s.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Phone: compact top bar */}
      <nav aria-label="Trade stages" className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <span className="text-sm">{stages[active]?.name}</span>
          <span className="num text-xs text-muted">
            {active + 1}/{stages.length}
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {stages.map((s, i) => (
            <button
              key={s.id}
              type="button"
              disabled={!canOpen(i)}
              onClick={() => onSelect(i)}
              aria-label={s.name}
              aria-current={i === active ? "step" : undefined}
              className="h-6 flex-1 py-2.5 disabled:cursor-not-allowed"
            >
              <span
                className={`block h-px w-full ${
                  s.complete ? (s.hasBreach ? "bg-amber" : "bg-accent") : i === active ? "bg-text/60" : "bg-border"
                }`}
              />
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

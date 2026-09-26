"use client";

import { useState } from "react";

export interface LeakRow {
  name: string;
  /** Average points of the total score lost in this stage. */
  loss: number;
  avgScore: number;
}

// Horizontal bars, sorted by points lost. One hue: this is magnitude, not identity.
export default function LeakBars({ rows }: { rows: LeakRow[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const sorted = [...rows].sort((a, b) => b.loss - a.loss);
  const max = Math.max(1, ...sorted.map((r) => r.loss));

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((r, i) => {
        const active = hover === r.name;
        return (
          <li
            key={r.name}
            tabIndex={0}
            onPointerEnter={() => setHover(r.name)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(r.name)}
            onBlur={() => setHover(null)}
            className="group relative -mx-2 rounded-md px-2 py-1.5 outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className={i === 0 && r.loss > 0 ? "text-text" : "text-muted"}>{r.name}</span>
              <span className="num text-text">
                −{r.loss.toFixed(1)}
                <span className="text-muted"> pts</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral/60">
              <div
                className="h-full rounded-full bg-accent transition-[filter]"
                style={{ width: `${(r.loss / max) * 100}%`, filter: active ? "brightness(1.15)" : undefined }}
              />
            </div>
            {active && (
              <div
                role="status"
                className="panel absolute right-2 top-full z-10 mt-1 rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(20,21,24,0.92)" }}
              >
                <div className="num text-base text-text">{Math.round(r.avgScore)}%</div>
                <div className="text-muted">average {r.name.toLowerCase()} score</div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { useId, useRef, useState } from "react";

export interface LinePoint {
  value: number | null;
  /** Tooltip lines: first is the heading (e.g. date), rest are details. */
  label: string[];
  /** Draw this point as a hollow amber ring (shape + colour, never colour alone). */
  flagged?: boolean;
}

interface LineChartProps {
  points: LinePoint[];
  height?: number;
  /** Compact sparkline: no axis labels, no per-point markers. */
  compact?: boolean;
  ariaLabel: string;
}

const W = 640;

// Single-series 0–100 line with a crosshair + tooltip that snaps to the nearest trade.
export default function LineChart({ points, height = 200, compact = false, ariaLabel }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();

  const padL = compact ? 2 : 32;
  const padR = compact ? 2 : 10;
  const padT = compact ? 4 : 10;
  const padB = compact ? 4 : 22;
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + (1 - v / 100) * innerH;

  // Break the path where a value is missing.
  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.value === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    pen = true;
  });

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = n <= 1 ? 0 : Math.round(((px - padL) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (!n) return;
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else return;
    e.preventDefault();
  }

  const hp = hover === null ? null : points[hover];
  const tipLeft = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
      >
        <clipPath id={clipId}>
          <rect x={padL - 6} y={0} width={innerW + 12} height={height} />
        </clipPath>
        {!compact &&
          [0, 50, 100].map((g) => (
            <g key={g}>
              <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={padL - 8} y={y(g)} dy="0.32em" textAnchor="end" className="num fill-[var(--muted)] text-[10px]">
                {g}
              </text>
            </g>
          ))}
        {compact && (
          <line x1={padL} x2={W - padR} y1={y(50)} y2={y(50)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="2 3" />
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
        <g clipPath={`url(#${clipId})`}>
          <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      {/* Markers in HTML so they stay round under the stretched viewBox. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {points.map((p, i) => {
          if (p.value === null || (compact && i !== hover)) return null;
          const size = i === hover ? 10 : 8;
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${(x(i) / W) * 100}%`,
                top: y(p.value),
                width: size,
                height: size,
                transform: "translate(-50%, -50%)",
                background: p.flagged ? "var(--bg)" : "var(--accent)",
                border: p.flagged ? "2px solid var(--amber)" : "2px solid var(--bg)",
              }}
            />
          );
        })}
      </div>

      {hp && hp.value !== null && (
        <div
          className="panel pointer-events-none absolute z-10 min-w-32 rounded-lg px-3 py-2 text-xs"
          style={{
            left: `${tipLeft}%`,
            top: 0,
            transform: `translate(${tipLeft > 60 ? "calc(-100% - 12px)" : "12px"}, 0)`,
            background: "rgba(20,21,24,0.92)",
          }}
          role="status"
        >
          <div className="num text-base text-text">{Math.round(hp.value)}%</div>
          {hp.label.map((l, i) => (
            <div key={i} className={i === 0 ? "text-muted" : "text-muted/80"}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

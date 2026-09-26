// Barely-there backdrop: 3% grid, a slow drifting glow, and a faint candlestick silhouette.
// Pure CSS/SVG so it costs nothing; the drift stops under reduced motion (see globals.css).

const CANDLES = [
  // [x, wickTop, bodyTop, bodyBottom, wickBottom]
  [40, 420, 440, 500, 520], [80, 400, 415, 470, 495], [120, 370, 385, 430, 450],
  [160, 380, 395, 445, 470], [200, 340, 350, 400, 420], [240, 320, 335, 370, 395],
  [280, 330, 345, 390, 410], [320, 290, 300, 345, 365], [360, 260, 275, 320, 340],
  [400, 275, 285, 330, 350], [440, 240, 250, 290, 315], [480, 210, 225, 265, 280],
  [520, 225, 240, 280, 300], [560, 190, 200, 240, 260], [600, 170, 180, 225, 245],
] as const;

export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 60%)",
          animation: "bg-drift 40s ease-in-out infinite alternate",
        }}
      />
      <svg
        viewBox="0 0 640 560"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-[0.015]"
      >
        {CANDLES.map(([x, wt, bt, bb, wb]) => (
          <g key={x} stroke="var(--text)" fill="var(--text)">
            <line x1={x} x2={x} y1={wt} y2={wb} strokeWidth={1.5} />
            <rect x={x - 8} y={bt} width={16} height={bb - bt} />
          </g>
        ))}
      </svg>
      <style>{`
        @keyframes bg-drift {
          from { transform: translate(-58%, -54%); }
          to   { transform: translate(-42%, -46%); }
        }
      `}</style>
    </div>
  );
}

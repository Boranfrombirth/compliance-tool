import Background from "./Background";

// Loading frame shown while a signed-in page fetches: same shell, quiet placeholder panels.
export default function PageSkeleton({ panels = [120, 260, 200] }: { panels?: number[] }) {
  return (
    <div className="relative min-h-screen" aria-busy="true" aria-label="Loading">
      <Background />
      <div className="border-b border-border px-4 py-3 sm:px-8">
        <div className="mx-auto h-7 max-w-5xl" />
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="h-8 w-48 animate-pulse rounded-md bg-white/[0.04]" />
        <div className="mt-8 flex flex-col gap-6">
          {panels.map((h, i) => (
            <div
              key={i}
              className="panel animate-pulse rounded-2xl"
              style={{ height: h, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

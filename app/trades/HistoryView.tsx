import Link from "next/link";
import LeakBars from "@/components/charts/LeakBars";
import LineChart from "@/components/charts/LineChart";
import type { HistoryData, HistoryTrade } from "@/lib/trades/history";

export const RANGES = [
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "365", label: "1 year", days: 365 },
  { key: "all", label: "All time", days: null },
] as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
const tradeName = (t: HistoryTrade) => [t.pair, t.direction].filter(Boolean).join(" · ") || "Trade";
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Start of the date range as ISO, or null for all time. Server-only, so reading the clock is fine. */
export function sinceDays(days: number | null) {
  return days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
}

/** Trailing moving average (window w) so stage lines show the trend, not every wobble. */
function rolling(series: (number | null)[], w: number) {
  return series.map((_, i) => {
    const win = series.slice(Math.max(0, i - w + 1), i + 1).filter((v): v is number => v !== null);
    return series[i] === null ? null : avg(win);
  });
}

export default function HistoryView({
  history,
  range: rangeKey,
  draft,
}: {
  history: HistoryData;
  range: string;
  draft: { id: string; pair: string | null } | null;
}) {
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[3];
  const { trades, stages, topBreaches } = history;

  const last10 = avg(trades.slice(-10).map((t) => t.total));
  const prev10 = avg(trades.slice(-20, -10).map((t) => t.total));
  const delta = last10 !== null && prev10 !== null ? last10 - prev10 : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-3xl tracking-tight">Trade history</h1>
        <Link
          href="/trade/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110"
        >
          {draft ? "Resume draft" : "Log a trade"}
        </Link>
      </div>

      {draft && (
        <p className="mt-3 text-sm text-muted">
          You have a trade in progress{draft.pair ? ` (${draft.pair})` : ""}.{" "}
          <Link href="/trade/new" className="text-accent hover:underline">
            Continue it
          </Link>
          .
        </p>
      )}

      {/* Filter row: scopes everything below. */}
      <nav aria-label="Date range" className="mt-6 flex flex-wrap gap-1 text-xs">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={r.key === "all" ? "/trades" : `/trades?range=${r.key}`}
            aria-current={r.key === range.key ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 transition ${
              r.key === range.key
                ? "border-accent/50 text-accent"
                : "border-border text-muted hover:text-text"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      {trades.length === 0 ? (
        <section className="panel mt-6 rounded-2xl p-10 text-center">
          <p className="font-serif text-2xl">No submitted trades {range.days ? `in the last ${range.label}` : "yet"}</p>
          <p className="mt-2 text-sm text-muted">
            Scores, trends and your leakiest stages appear here once you submit trades.
          </p>
        </section>
      ) : (
        <>
          {/* Headline numbers */}
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Trades" value={String(trades.length)} />
            <Stat label="Average score" value={`${Math.round(history.avgTotal ?? 0)}%`} />
            <Stat label="Compliant" value={`${Math.round(history.compliantRate ?? 0)}%`} hint="no critical breach" />
            <Stat
              label="Last 10 average"
              value={`${Math.round(last10 ?? 0)}%`}
              hint={delta === null ? "needs 11+ trades to compare" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)} vs previous 10`}
            />
          </section>

          {/* Total score over time */}
          <section className="panel mt-6 rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl">Score per trade</h2>
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="inline-block h-2 w-2 rounded-full border-2 border-amber" aria-hidden />
                Non-compliant
              </span>
            </div>
            <LineChart
              ariaLabel={`Total compliance score for ${trades.length} trades, oldest to newest. Use arrow keys to step through trades.`}
              points={trades.map((t) => ({
                value: t.total,
                flagged: t.nonCompliant,
                label: [
                  `${fmtDate(t.submittedAt)} · ${tradeName(t)}`,
                  t.nonCompliant ? "Non-compliant" : "Compliant",
                  ...(t.resultR !== null ? [`${t.resultR > 0 ? "+" : ""}${t.resultR}R`] : []),
                ],
              }))}
            />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Where compliance leaks */}
            <section className="panel rounded-2xl p-5 sm:p-6">
              <h2 className="font-serif text-xl">Where compliance leaks</h2>
              <p className="mb-5 mt-1 text-xs text-muted">
                Average points of the total score lost in each stage, per trade.
              </p>
              <LeakBars rows={stages.map((s) => ({ name: s.name, loss: s.avgLoss, avgScore: s.avgScore }))} />
            </section>

            {/* Most frequent breaches */}
            <section className="panel rounded-2xl p-5 sm:p-6">
              <h2 className="font-serif text-xl">Most frequent breaches</h2>
              <p className="mb-5 mt-1 text-xs text-muted">Checks you marked not met most often.</p>
              {topBreaches.length === 0 ? (
                <p className="text-sm text-accent">No breaches in this period.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border">
                  {topBreaches.map((b) => (
                    <li key={`${b.stage}-${b.label}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">
                          {b.label}
                          {b.isCritical && (
                            <span className="ml-2 rounded border border-amber/40 px-1.5 py-0.5 align-middle text-[10px] uppercase tracking-wider text-amber">
                              Critical
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted">{b.stage}</span>
                      </span>
                      <span className="num shrink-0 text-muted">
                        <span className="text-text">{b.count}</span>/{trades.length}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {/* Stage compliance over time: small multiples, one series each */}
          <section className="panel mt-6 rounded-2xl p-5 sm:p-6">
            <h2 className="font-serif text-xl">Stage compliance over time</h2>
            <p className="mb-5 mt-1 text-xs text-muted">Rolling average of the last 5 trades. Dashed line marks 50%.</p>
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {stages.map((s) => {
                const smooth = rolling(s.series, 5);
                const latest = [...smooth].reverse().find((v) => v !== null);
                return (
                  <div key={s.name}>
                    <div className="mb-2 flex items-baseline justify-between text-sm">
                      <span className="text-muted">{s.name}</span>
                      <span className="num">{latest == null ? "—" : `${Math.round(latest)}%`}</span>
                    </div>
                    <LineChart
                      compact
                      height={56}
                      ariaLabel={`${s.name}: rolling average stage score over ${trades.length} trades`}
                      points={smooth.map((v, i) => ({
                        value: v,
                        label: [
                          `${fmtDate(trades[i].submittedAt)} · ${tradeName(trades[i])}`,
                          s.series[i] === null ? "" : `This trade ${Math.round(s.series[i]!)}%`,
                        ].filter(Boolean),
                      }))}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trade list (also the table view of the charts above) */}
          <section className="panel mt-6 overflow-hidden rounded-2xl">
            <h2 className="px-5 pt-5 font-serif text-xl sm:px-6">All trades</h2>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.15em] text-muted">
                    <th className="px-5 py-2 font-normal sm:px-6">Date</th>
                    <th className="px-3 py-2 font-normal">Trade</th>
                    <th className="px-3 py-2 text-right font-normal">Result</th>
                    <th className="px-3 py-2 text-right font-normal">Score</th>
                    <th className="px-5 py-2 font-normal sm:px-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trades].reverse().map((t) => (
                    <tr key={t.id} className="border-b border-border/60 transition last:border-0 hover:bg-white/[0.02]">
                      <td className="num px-5 py-3 text-muted sm:px-6">{fmtDate(t.submittedAt)}</td>
                      <td className="px-3 py-3">
                        <Link href={`/trade/${t.id}`} className="hover:text-accent">
                          {tradeName(t)}
                        </Link>
                        <span className="num ml-2 text-[10px] text-muted">v{t.rulesetVersion}</span>
                      </td>
                      <td className="num px-3 py-3 text-right text-muted">
                        {t.resultR === null ? "—" : `${t.resultR > 0 ? "+" : ""}${t.resultR}R`}
                      </td>
                      <td className="num px-3 py-3 text-right">{Math.round(t.total)}%</td>
                      <td className="px-5 py-3 sm:px-6">
                        {t.nonCompliant ? (
                          <span className="text-xs text-amber">▲ Non-compliant</span>
                        ) : (
                          <span className="text-xs text-muted">Compliant</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}


function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted">{label}</div>
      <div className="num mt-2 text-2xl">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

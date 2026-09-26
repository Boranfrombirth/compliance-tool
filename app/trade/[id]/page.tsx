import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProgressRing from "@/components/ProgressRing";
import { score } from "@/lib/scoring/score";
import { requireUser } from "@/lib/supabase/require-user";
import { loadResults, loadRuleset, toAnswers } from "@/lib/trades/load";

export const metadata = { title: "Trade summary · Trade Compliance" };

// Summary of a submitted trade. Phase 7 extends this; scores are recomputed from the
// ruleset version the trade was graded under.
export default async function TradeSummaryPage({ params }: PageProps<"/trade/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: trade } = await supabase
    .from("trades")
    .select("id, ruleset_id, status, pair, direction, total_score, non_compliant, submitted_at")
    .eq("id", id)
    .maybeSingle();
  if (!trade) notFound();
  if (trade.status === "draft") redirect("/trade/new");

  const [ruleset, results] = await Promise.all([
    loadRuleset(supabase, trade.ruleset_id),
    loadResults(supabase, trade.id),
  ]);
  if (!ruleset) notFound();
  const result = score(ruleset, toAnswers(results));
  const total = Number(trade.total_score ?? result.total);
  const nonCompliant = trade.non_compliant ?? result.nonCompliant;

  return (
    <AppShell email={user.email ?? ""}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {ruleset.name} · v{ruleset.version}
        {trade.submitted_at && ` · ${new Date(trade.submitted_at).toLocaleString("en-GB")}`}
      </p>
      <h1 className="font-serif text-3xl tracking-tight">
        {[trade.pair, trade.direction].filter(Boolean).join(" · ") || "Trade"}
      </h1>

      <section className="panel mt-8 flex flex-col items-center gap-3 rounded-2xl p-8">
        <ProgressRing value={total} size={160} tone={nonCompliant ? "amber" : "accent"} label="Total score" />
        <p className={`text-xs uppercase tracking-[0.2em] ${nonCompliant ? "text-amber" : "text-accent"}`}>
          {nonCompliant ? "Non-compliant" : "Compliant"}
        </p>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {result.stages.map((s) => (
          <div key={s.id} className="panel flex flex-col items-center gap-3 rounded-2xl p-5 text-center">
            <ProgressRing value={s.score} size={72} tone={s.breaches.length ? "amber" : "accent"} label={s.name} />
            <span className="text-xs text-muted">{s.name}</span>
          </div>
        ))}
      </section>

      <section className="panel mt-6 rounded-2xl p-6">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">Breaches</h2>
        {result.breaches.length === 0 ? (
          <p className="mt-3 text-sm text-accent">None. Every check met.</p>
        ) : (
          result.stages
            .filter((s) => s.breaches.length)
            .map((s) => (
              <div key={s.id} className="mt-4">
                <h3 className="font-serif text-lg">{s.name}</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {s.breaches.map((b) => (
                    <li key={b.checkId} className="flex items-center gap-2 text-sm text-amber">
                      <span className="h-px w-3 bg-amber" aria-hidden />
                      {b.label}
                      {b.isCritical && (
                        <span className="rounded border border-amber/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                          Critical
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
        )}
      </section>

      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/trade/new" className="rounded-md bg-accent px-4 py-2 font-medium text-bg hover:brightness-110">
          Log another trade
        </Link>
        <Link href="/trades" className="px-2 py-2 text-muted hover:text-text">
          History
        </Link>
      </div>
    </AppShell>
  );
}

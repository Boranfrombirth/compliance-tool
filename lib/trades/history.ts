import type { SupabaseClient } from "@supabase/supabase-js";
import { score, type Answers } from "@/lib/scoring/score";
import { loadRuleset } from "./load";
import type { RulesetView } from "./types";

export interface HistoryTrade {
  id: string;
  pair: string | null;
  direction: "long" | "short" | null;
  resultR: number | null;
  total: number;
  nonCompliant: boolean;
  submittedAt: string;
  rulesetVersion: number;
  /** Stage score by stage name (names are stable across ruleset versions). */
  stageScores: Record<string, number>;
  /** Points of the total lost in each stage: stage share × (100 − stage score). */
  stageLoss: Record<string, number>;
  breaches: { label: string; stage: string; isCritical: boolean }[];
}

export interface StageStat {
  name: string;
  avgScore: number;
  /** Average points of the total lost in this stage per trade. */
  avgLoss: number;
  /** Stage score per trade, oldest first (null where the trade's ruleset lacked the stage). */
  series: (number | null)[];
}

export interface HistoryData {
  trades: HistoryTrade[];
  stages: StageStat[];
  topBreaches: { label: string; stage: string; count: number; isCritical: boolean }[];
  avgTotal: number | null;
  compliantRate: number | null;
}

const ID_BATCH = 100;
const PAGE = 1000;

/** Submitted trades since `since` (ISO) with scores recomputed against each trade's own ruleset version. */
export async function loadHistory(supabase: SupabaseClient, since: string | null): Promise<HistoryData> {
  let query = supabase
    .from("trades")
    .select("id, ruleset_id, pair, direction, result_r, total_score, non_compliant, submitted_at")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });
  if (since) query = query.gte("submitted_at", since);
  const { data: rows, error } = await query;
  if (error) throw error;
  const tradeRows = rows ?? [];

  // Rulesets, one load per version used.
  const rulesetIds = [...new Set(tradeRows.map((t) => t.ruleset_id as string))];
  const rulesets = new Map<string, RulesetView>();
  await Promise.all(
    rulesetIds.map(async (id) => {
      const rs = await loadRuleset(supabase, id);
      if (rs) rulesets.set(id, rs);
    }),
  );

  // Answers, batched by trade id and paginated past the 1000-row API limit.
  const answers = new Map<string, Answers>();
  for (let i = 0; i < tradeRows.length; i += ID_BATCH) {
    const ids = tradeRows.slice(i, i + ID_BATCH).map((t) => t.id as string);
    for (let from = 0; ; from += PAGE) {
      const { data, error: resError } = await supabase
        .from("check_results")
        .select("trade_id, check_id, state")
        .in("trade_id", ids)
        .order("id")
        .range(from, from + PAGE - 1);
      if (resError) throw resError;
      for (const r of data ?? []) {
        const a = answers.get(r.trade_id) ?? {};
        a[r.check_id] = r.state;
        answers.set(r.trade_id, a);
      }
      if (!data || data.length < PAGE) break;
    }
  }

  const trades: HistoryTrade[] = [];
  for (const t of tradeRows) {
    const rs = rulesets.get(t.ruleset_id);
    if (!rs) continue;
    const result = score(rs, answers.get(t.id) ?? {});
    const weightSum = rs.stages
      .filter((s, i) => s.weight > 0 && result.stages[i].totalWeight > 0)
      .reduce((a, s) => a + s.weight, 0);
    const stageScores: Record<string, number> = {};
    const stageLoss: Record<string, number> = {};
    rs.stages.forEach((s, i) => {
      const sr = result.stages[i];
      if (sr.totalWeight === 0) return;
      stageScores[s.name] = sr.score;
      stageLoss[s.name] = weightSum > 0 ? (s.weight / weightSum) * (100 - sr.score) : 0;
    });
    trades.push({
      id: t.id,
      pair: t.pair,
      direction: t.direction,
      resultR: t.result_r === null ? null : Number(t.result_r),
      total: t.total_score === null ? result.total : Number(t.total_score),
      nonCompliant: t.non_compliant ?? result.nonCompliant,
      submittedAt: t.submitted_at,
      rulesetVersion: rs.version,
      stageScores,
      stageLoss,
      breaches: result.breaches.map((b) => ({ label: b.label, stage: b.stageName, isCritical: b.isCritical })),
    });
  }

  // Stage order follows the newest ruleset, with any retired stages after it.
  const newest = trades.length ? rulesets.get(tradeRows[tradeRows.length - 1].ruleset_id) : undefined;
  const names = [...(newest?.stages.map((s) => s.name) ?? [])];
  for (const t of trades) for (const n of Object.keys(t.stageScores)) if (!names.includes(n)) names.push(n);

  const stages: StageStat[] = names.map((name) => {
    const scored = trades.filter((t) => name in t.stageScores);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    return {
      name,
      avgScore: avg(scored.map((t) => t.stageScores[name])),
      avgLoss: avg(scored.map((t) => t.stageLoss[name])),
      series: trades.map((t) => t.stageScores[name] ?? null),
    };
  });

  const counts = new Map<string, { label: string; stage: string; count: number; isCritical: boolean }>();
  for (const t of trades)
    for (const b of t.breaches) {
      const key = `${b.stage}\u0000${b.label}`;
      const c = counts.get(key) ?? { ...b, count: 0 };
      c.count++;
      counts.set(key, c);
    }
  const topBreaches = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  return {
    trades,
    stages,
    topBreaches,
    avgTotal: trades.length ? trades.reduce((a, t) => a + t.total, 0) / trades.length : null,
    compliantRate: trades.length ? (trades.filter((t) => !t.nonCompliant).length / trades.length) * 100 : null,
  };
}

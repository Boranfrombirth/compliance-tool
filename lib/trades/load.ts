import type { SupabaseClient } from "@supabase/supabase-js";
import type { Answers, CheckState, Ruleset } from "@/lib/scoring/score";
import type { ResultView, RulesetView } from "./types";

interface CheckRow {
  id: string;
  label: string;
  description: string | null;
  weight: number;
  is_critical: boolean;
  position: number;
  input_type: "tick" | "text";
}

interface StageRow {
  id: string;
  name: string;
  weight: number;
  position: number;
  checks: CheckRow[];
}

/** Load a ruleset with its stages and checks, ordered. RLS limits it to the signed-in user. */
export async function loadRuleset(supabase: SupabaseClient, rulesetId: string): Promise<RulesetView | null> {
  const { data, error } = await supabase
    .from("rulesets")
    .select(
      "id, name, version, stages(id, name, weight, position, checks(id, label, description, weight, is_critical, position, input_type))",
    )
    .eq("id", rulesetId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const stages = [...(data.stages as StageRow[])].sort((a, b) => a.position - b.position);
  return {
    id: data.id,
    name: data.name,
    version: data.version,
    stages: stages.map((s) => ({
      id: s.id,
      name: s.name,
      weight: Number(s.weight),
      checks: [...s.checks]
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          id: c.id,
          label: c.label,
          description: c.description,
          weight: c.weight,
          isCritical: c.is_critical,
          inputType: c.input_type,
        })),
    })),
  };
}

export async function loadResults(
  supabase: SupabaseClient,
  tradeId: string,
): Promise<Record<string, ResultView>> {
  const { data, error } = await supabase
    .from("check_results")
    .select("check_id, state, text_value")
    .eq("trade_id", tradeId);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((r) => [r.check_id, { state: r.state as CheckState, text: r.text_value ?? "" }]),
  );
}

export function toScoringRuleset(ruleset: RulesetView): Ruleset {
  return { stages: ruleset.stages };
}

export function toAnswers(results: Record<string, ResultView>): Answers {
  return Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.state]));
}

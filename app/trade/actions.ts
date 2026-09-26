"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { score } from "@/lib/scoring/score";
import { loadResults, loadRuleset, toAnswers, toScoringRuleset } from "@/lib/trades/load";
import { requireUser } from "@/lib/supabase/require-user";

/** Create a draft trade against the active ruleset, with one unanswered result per check. */
export async function startTrade(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("trades")
    .select("id")
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/trade/new");

  const { data: active, error: rsError } = await supabase
    .from("rulesets")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (rsError || !active) throw new Error("No active ruleset found for this account.");

  const pair = String(formData.get("pair") ?? "").trim().toUpperCase() || null;
  const direction = formData.get("direction");

  const { data: trade, error } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      ruleset_id: active.id,
      pair,
      direction: direction === "long" || direction === "short" ? direction : null,
      opened_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;

  const ruleset = await loadRuleset(supabase, active.id);
  const rows = (ruleset?.stages ?? []).flatMap((s) =>
    s.checks.map((c) => ({ trade_id: trade.id, check_id: c.id, state: "unanswered" })),
  );
  if (rows.length) {
    const { error: resError } = await supabase.from("check_results").insert(rows);
    if (resError) {
      await supabase.from("trades").delete().eq("id", trade.id);
      throw resError;
    }
  }

  redirect("/trade/new");
}

/** Score on the server from stored answers, then lock the trade. */
export async function submitTrade(tradeId: string): Promise<{ error: string } | void> {
  const { supabase } = await requireUser();

  const { data: trade } = await supabase
    .from("trades")
    .select("id, ruleset_id, status")
    .eq("id", tradeId)
    .maybeSingle();
  if (!trade) return { error: "Trade not found." };
  if (trade.status !== "draft") redirect(`/trade/${tradeId}`);

  const ruleset = await loadRuleset(supabase, trade.ruleset_id);
  if (!ruleset) return { error: "Ruleset not found." };
  const result = score(toScoringRuleset(ruleset), toAnswers(await loadResults(supabase, tradeId)));
  if (!result.complete) return { error: "Answer every check before submitting." };

  const { error } = await supabase
    .from("trades")
    .update({
      status: "submitted",
      total_score: Math.round(result.total * 100) / 100,
      non_compliant: result.nonCompliant,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", tradeId)
    .eq("status", "draft");
  if (error) return { error: error.message };

  revalidatePath("/trades");
  redirect(`/trade/${tradeId}`);
}

export async function discardTrade(tradeId: string) {
  const { supabase } = await requireUser();
  await supabase.from("trades").delete().eq("id", tradeId).eq("status", "draft");
  redirect("/trade/new");
}

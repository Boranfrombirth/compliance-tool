import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/supabase/require-user";
import { loadRuleset } from "@/lib/trades/load";
import RulesetEditor from "./RulesetEditor";

export const metadata = { title: "Ruleset · Trade Compliance" };

export default async function RulesetPage() {
  const { supabase, user } = await requireUser();

  const [{ data: active }, { data: versions }] = await Promise.all([
    supabase.from("rulesets").select("id").eq("is_active", true).maybeSingle(),
    supabase
      .from("rulesets")
      .select("id, name, version, is_active, created_at, trades(count)")
      .order("version", { ascending: false }),
  ]);

  const ruleset = active ? await loadRuleset(supabase, active.id) : null;
  const history = (versions ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
    version: v.version as number,
    isActive: v.is_active as boolean,
    createdAt: v.created_at as string,
    tradeCount: (v.trades as { count: number }[])[0]?.count ?? 0,
  }));
  const activeTrades = history.find((v) => v.isActive)?.tradeCount ?? 0;

  return (
    <AppShell email={user.email ?? ""}>
      {ruleset ? (
        <RulesetEditor ruleset={ruleset} tradeCount={activeTrades} versions={history} />
      ) : (
        <p className="text-sm text-amber">No active ruleset found for this account.</p>
      )}
    </AppShell>
  );
}

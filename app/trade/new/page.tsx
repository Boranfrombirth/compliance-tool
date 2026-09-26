import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/supabase/require-user";
import { loadResults, loadRuleset } from "@/lib/trades/load";
import { DETAIL_COLUMNS, type TradeDetails } from "@/lib/trades/types";
import { startTrade } from "../actions";
import Stepper from "./Stepper";

export const metadata = { title: "New trade · Trade Compliance" };

export default async function NewTradePage() {
  const { supabase, user } = await requireUser();

  // Resume the open draft if there is one; otherwise offer to start.
  const { data: draft } = await supabase
    .from("trades")
    .select(`id, ruleset_id, ${DETAIL_COLUMNS}`)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draft) {
    const [ruleset, results] = await Promise.all([
      loadRuleset(supabase, draft.ruleset_id),
      loadResults(supabase, draft.id),
    ]);
    if (ruleset) {
      const { id, ruleset_id: _r, ...details } = draft;
      void _r;
      return (
        <AppShell email={user.email ?? ""}>
          <Stepper
            tradeId={id}
            ruleset={ruleset}
            initialResults={results}
            initialDetails={details as TradeDetails}
          />
        </AppShell>
      );
    }
  }

  return (
    <AppShell email={user.email ?? ""}>
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl tracking-tight">New trade</h1>
        <p className="mt-2 text-sm text-muted">
          Walk the trade through your four stages as it happens. Your progress saves as you go.
        </p>
        <form action={startTrade} className="panel mt-8 flex flex-col gap-4 rounded-2xl p-6">
          <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-wider text-muted">
            Pair
            <input
              name="pair"
              placeholder="EURUSD"
              autoComplete="off"
              className="num rounded-md border border-border bg-black/20 px-3 py-2.5 text-sm text-text outline-none placeholder:text-muted/50 focus:border-accent/50"
            />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">Direction</legend>
            <div className="grid grid-cols-2 gap-2">
              {["long", "short"].map((d) => (
                <label
                  key={d}
                  className="cursor-pointer rounded-md border border-border px-3 py-2.5 text-center text-sm capitalize text-muted transition has-[:checked]:border-accent/60 has-[:checked]:text-accent"
                >
                  <input type="radio" name="direction" value={d} className="sr-only" />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="mt-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg transition hover:brightness-110"
          >
            Start trade
          </button>
        </form>
      </div>
    </AppShell>
  );
}

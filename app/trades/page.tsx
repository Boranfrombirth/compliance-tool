import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata = { title: "History · Trade Compliance" };

export default async function TradesPage() {
  const { supabase, user } = await requireUser();

  const { data: ruleset, error } = await supabase
    .from("rulesets")
    .select("name, version, stages(name, position, weight, checks(id))")
    .eq("is_active", true)
    .order("position", { referencedTable: "stages" })
    .maybeSingle();

  return (
    <AppShell email={user.email ?? ""}>
      <h1 className="font-serif text-3xl tracking-tight">Trade history</h1>
      <p className="mt-2 text-sm text-muted">No trades yet. Trade history arrives in phase 7.</p>

      <section className="mt-10 rounded-xl border border-border bg-white/[0.04] p-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Active ruleset</h2>
        {error && <p className="mt-3 text-sm text-amber">Could not load ruleset: {error.message}</p>}
        {!error && !ruleset && (
          <p className="mt-3 text-sm text-amber">No active ruleset found for this account.</p>
        )}
        {ruleset && (
          <>
            <p className="mt-2 font-serif text-xl">
              {ruleset.name} <span className="num text-sm text-muted">v{ruleset.version}</span>
            </p>
            <ul className="mt-4 divide-y divide-white/[0.06] text-sm">
              {ruleset.stages.map((s) => (
                <li key={s.name} className="flex justify-between py-2">
                  <span>{s.name}</span>
                  <span className="num text-muted">
                    {s.checks.length} checks · weight {s.weight}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </AppShell>
  );
}

import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/supabase/require-user";

export default async function RulesetPage() {
  const { user } = await requireUser();
  return (
    <AppShell email={user.email ?? ""}>
      <h1 className="font-serif text-3xl tracking-tight">Ruleset</h1>
      <p className="mt-2 text-sm text-muted">The ruleset editor arrives in phase 8.</p>
    </AppShell>
  );
}

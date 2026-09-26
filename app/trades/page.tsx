import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/supabase/require-user";
import { loadHistory } from "@/lib/trades/history";
import HistoryView, { RANGES, sinceDays } from "./HistoryView";

export const metadata = { title: "History · Trade Compliance" };

export default async function TradesPage({ searchParams }: PageProps<"/trades">) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const range = RANGES.find((r) => r.key === params.range) ?? RANGES[3];
  const since = sinceDays(range.days);

  const [history, { data: draft }] = await Promise.all([
    loadHistory(supabase, since),
    supabase.from("trades").select("id, pair").eq("status", "draft").limit(1).maybeSingle(),
  ]);
  return (
    <AppShell email={user.email ?? ""}>
      <HistoryView history={history} range={range.key} draft={draft} />
    </AppShell>
  );
}

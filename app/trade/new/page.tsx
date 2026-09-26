import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/supabase/require-user";

export default async function NewTradePage() {
  const { user } = await requireUser();
  return (
    <AppShell email={user.email ?? ""}>
      <h1 className="font-serif text-3xl tracking-tight">New trade</h1>
      <p className="mt-2 text-sm text-[#8A8780]">The stepper arrives in phase 6.</p>
    </AppShell>
  );
}

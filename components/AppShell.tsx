import Link from "next/link";

// Minimal signed-in frame; the full design system arrives in phase 5.
export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#E8E6E1]">
      <header className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-8">
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/trades" className="font-serif text-lg tracking-tight">
            Trade Compliance
          </Link>
          <Link href="/trade/new" className="text-[#8A8780] hover:text-[#E8E6E1]">New trade</Link>
          <Link href="/trades" className="text-[#8A8780] hover:text-[#E8E6E1]">History</Link>
          <Link href="/ruleset" className="text-[#8A8780] hover:text-[#E8E6E1]">Ruleset</Link>
        </nav>
        <form action="/auth/signout" method="post" className="flex items-center gap-3 text-xs text-[#8A8780]">
          <span className="hidden sm:inline">{email}</span>
          <button type="submit" className="rounded border border-white/[0.08] px-2.5 py-1 hover:text-[#E8E6E1]">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}

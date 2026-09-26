import Link from "next/link";
import Background from "./Background";

// Signed-in frame: top nav, backdrop and a centred content column.
export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-text">
      <Background />
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/trades" className="font-serif text-lg tracking-tight">
            Trade Compliance
          </Link>
          <Link href="/trade/new" className="text-muted hover:text-text">New trade</Link>
          <Link href="/trades" className="text-muted hover:text-text">History</Link>
          <Link href="/ruleset" className="text-muted hover:text-text">Ruleset</Link>
        </nav>
        <form action="/auth/signout" method="post" className="flex items-center gap-3 text-xs text-muted">
          <span className="hidden sm:inline">{email}</span>
          <button type="submit" className="rounded border border-border px-2.5 py-1 hover:text-text">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}

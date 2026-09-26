import Link from "next/link";
import Background from "./Background";
import NavLinks from "./NavLinks";

// Signed-in frame: top nav, backdrop and a centred content column.
// On phones the links drop to a second row under the brand.
export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-text">
      <Background />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-2 px-4 pt-3 sm:flex-nowrap sm:px-8 sm:py-3">
          <Link href="/trades" className="font-serif text-lg tracking-tight">
            Trade Compliance
          </Link>
          <nav
            aria-label="Main"
            className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto px-4 pb-3 text-sm sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:p-0"
          >
            <NavLinks />
          </nav>
          <form action="/auth/signout" method="post" className="ml-auto flex items-center gap-3 text-xs text-muted">
            <span className="hidden max-w-48 truncate md:inline">{email}</span>
            <button type="submit" className="rounded border border-border px-2.5 py-1 transition hover:text-text">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

import Link from "next/link";
import Background from "@/components/Background";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <Background />
      <div className="panel max-w-md rounded-2xl p-8 text-center">
        <p className="num text-sm text-muted">404</p>
        <h1 className="mt-1 font-serif text-2xl">Page not found</h1>
        <p className="mt-2 text-sm text-muted">That page or trade doesn&apos;t exist, or isn&apos;t yours.</p>
        <Link
          href="/trades"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110"
        >
          Go to history
        </Link>
      </div>
    </main>
  );
}

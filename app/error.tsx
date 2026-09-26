"use client";

import Link from "next/link";
import { useEffect } from "react";
import Background from "@/components/Background";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <Background />
      <div className="panel max-w-md rounded-2xl p-8 text-center">
        <h1 className="font-serif text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          The page couldn&apos;t load. Your saved trades and drafts are safe.
        </p>
        {error.digest && <p className="num mt-3 text-[11px] text-muted/70">Reference {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-accent px-4 py-2 font-medium text-bg transition hover:brightness-110"
          >
            Try again
          </button>
          <Link href="/trades" className="rounded-md border border-border px-4 py-2 text-muted transition hover:text-text">
            Go to history
          </Link>
        </div>
      </div>
    </main>
  );
}

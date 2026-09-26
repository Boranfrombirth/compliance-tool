import { safeNext } from "@/lib/safe-next";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Trade Compliance" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const linkError = params.error === "link";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 text-text">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-serif text-3xl tracking-tight">Trade Compliance</h1>
        <p className="mb-8 text-center text-sm text-muted">
          Every trade, graded against your own rules.
        </p>
        <LoginForm next={next} linkError={linkError} />
      </div>
    </main>
  );
}

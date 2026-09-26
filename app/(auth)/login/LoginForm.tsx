"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "signin", label: "Sign in" },
  { mode: "signup", label: "Create account" },
  { mode: "magic", label: "Magic link" },
];

export default function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? "That link is invalid or has expired. Request a new one." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setNotice("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: callbackUrl, shouldCreateUser: false },
        });
        if (error) throw error;
        setNotice("Check your email for a sign-in link.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-[#E8E6E1] placeholder:text-[#8A8780]/60 outline-none transition focus:border-[#C9A96E]/60";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-md bg-black/30 p-1 text-xs">
        {TABS.map((t) => (
          <button
            key={t.mode}
            type="button"
            onClick={() => {
              setMode(t.mode);
              setError(null);
              setNotice(null);
            }}
            className={`rounded px-2 py-1.5 transition ${
              mode === t.mode ? "bg-white/[0.08] text-[#C9A96E]" : "text-[#8A8780] hover:text-[#E8E6E1]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-[#8A8780]">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        {mode !== "magic" && (
          <label className="flex flex-col gap-1.5 text-xs text-[#8A8780]">
            Password
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {error && <p className="text-xs text-[#D98E3A]">{error}</p>}
        {notice && <p className="text-xs text-[#C9A96E]">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-md bg-[#C9A96E] px-3 py-2.5 text-sm font-medium text-[#0B0C0E] transition hover:bg-[#d4b67e] disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send magic link"}
        </button>
      </form>
    </div>
  );
}

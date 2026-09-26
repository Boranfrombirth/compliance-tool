import { redirect } from "next/navigation";
import { createClient } from "./server";

// Server-side guard for protected pages (the proxy also redirects, this is defence in depth).
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

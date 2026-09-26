import { redirect } from "next/navigation";

// The proxy routes "/" to /login or /trades; this is a fallback.
export default function Home() {
  redirect("/login");
}

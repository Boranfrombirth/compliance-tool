// Only allow same-site relative redirects, so ?next= can't send users off-site.
export function safeNext(next: string | null | undefined, fallback = "/trades") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

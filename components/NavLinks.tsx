"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/trade/new", label: "New trade", match: (p: string) => p.startsWith("/trade/") },
  { href: "/trades", label: "History", match: (p: string) => p === "/trades" },
  { href: "/ruleset", label: "Ruleset", match: (p: string) => p.startsWith("/ruleset") },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap py-1 transition ${
              active ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            {l.label}
            {active && <span className="absolute inset-x-0 -bottom-[3px] h-px bg-accent sm:-bottom-[13px]" aria-hidden />}
          </Link>
        );
      })}
    </>
  );
}

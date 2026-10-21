"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/studio", label: "Vue d'ensemble", exact: true },
  { href: "/studio/contenus", label: "Contenus" },
  { href: "/studio/revues", label: "Relectures" },
  { href: "/studio/livrables", label: "Livrables à relire" },
  { href: "/studio/apprenants", label: "Utilisateurs" },
  { href: "/studio/support", label: "Support" },
  { href: "/studio/organisations", label: "Organisations" },
  { href: "/studio/qualite", label: "Qualité" },
  { href: "/studio/reglages", label: "Réglages et offres" },
  { href: "/studio/audit", label: "Journal d'audit" },
];

export function StudioNav() {
  return (
    <Suspense fallback={<NavList pathname="" />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Harmonie Studio" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-sm transition", active ? "bg-ink text-paper" : "text-ink-2 hover:bg-mist")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

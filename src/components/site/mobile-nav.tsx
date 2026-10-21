"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="menu-mobile"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-ink-2 hover:bg-mist"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open ? (
        <nav id="menu-mobile" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }} className="absolute inset-x-0 top-full border-b border-line bg-paper px-4 pb-6 pt-2 shadow-[var(--shadow-lift)]">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-[var(--radius-control)] px-3 py-2.5 text-[15px] text-ink hover:bg-mist">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/connexion" className="flex h-11 items-center justify-center rounded-[var(--radius-control)] border border-line-strong text-sm font-medium">
              Se connecter
            </Link>
            <Link href="/inscription" className="flex h-11 items-center justify-center rounded-[var(--radius-control)] bg-ink text-sm font-medium text-paper">
              Créer un compte
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { buttonClass } from "@/components/ui/button";

export const MAIN_NAV = [
  { href: "/formations", label: "Formations" },
  { href: "/laboratoires", label: "Laboratoires" },
  { href: "/carriere", label: "Carrière" },
  { href: "/methode", label: "Méthode" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/entreprises", label: "Entreprises" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Harmonie IT Academy, accueil" className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {MAIN_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-[var(--radius-control)] px-3 py-2 text-sm text-ink-2 transition hover:bg-mist hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/connexion" className="hidden whitespace-nowrap rounded-[var(--radius-control)] px-3 py-2 text-sm text-ink-2 hover:bg-mist hover:text-ink sm:inline-block">
            Se connecter
          </Link>
          <Link href="/inscription" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
            Commencer gratuitement
          </Link>
          <MobileNav links={MAIN_NAV} />
        </div>
      </div>
    </header>
  );
}

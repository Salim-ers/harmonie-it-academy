"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  FlaskConical,
  Gauge,
  LifeBuoy,
  PenLine,
  Radar,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const CAMPUS_NAV = [
  { href: "/campus", label: "Tableau de bord", icon: Gauge, exact: true },
  { href: "/campus/formations", label: "Mes formations", icon: BookOpen },
  { href: "/campus/laboratoires", label: "Laboratoires", icon: FlaskConical },
  { href: "/campus/evaluations", label: "Quiz et examens", icon: ClipboardCheck },
  { href: "/campus/livrables", label: "Livrables et mentor", icon: PenLine },
  { href: "/campus/carriere", label: "Carrière et entretiens", icon: BriefcaseBusiness },
  { href: "/campus/competences", label: "Compétences", icon: Radar },
  { href: "/campus/attestations", label: "Attestations", icon: Award },
  { href: "/campus/facturation", label: "Abonnement", icon: CreditCard },
  { href: "/campus/support", label: "Aide et support", icon: LifeBuoy },
  { href: "/campus/compte", label: "Compte et sécurité", icon: Settings },
];

/** Le chemin courant n'est connu qu'à l'exécution : la liste s'affiche d'abord sans état actif. */
export function CampusNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList pathname="" onNavigate={onNavigate} />}>
      <ActiveNav onNavigate={onNavigate} />
    </Suspense>
  );
}

function ActiveNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Espace étudiant">
      <ul className="space-y-0.5">
        {CAMPUS_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm transition",
                  active ? "bg-mist font-medium text-ink" : "text-ink-2 hover:bg-mist/70 hover:text-ink",
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-signal" : "text-muted")} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

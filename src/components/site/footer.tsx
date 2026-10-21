import Image from "next/image";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Monogram } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Apprendre",
    links: [
      { href: "/formations", label: "Toutes les formations" },
      { href: "/ecoles/support", label: "École du support IT" },
      { href: "/ecoles/infrastructure", label: "Infrastructure et sécurité" },
      { href: "/laboratoires", label: "Laboratoires" },
      { href: "/glossaire", label: "Glossaire FR / EN" },
    ],
  },
  {
    title: "Préparer l'emploi",
    links: [
      { href: "/carriere", label: "Harmonie Career" },
      { href: "/methode", label: "Méthode pédagogique" },
      { href: "/verifier", label: "Vérifier une attestation" },
    ],
  },
  {
    title: "Harmonie",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/entreprises", label: "Entreprises" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Monogram className="h-9 w-9 text-ink" />
              <div>
                <p className="font-semibold text-ink">Harmonie IT Academy</p>
                <p className="text-sm text-muted">Apprendre. Pratiquer. Maîtriser.</p>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Une plateforme de formation aux métiers de l&apos;informatique conçue par Harmonie Solutions. Attestations internes : elles ne sont ni des diplômes d&apos;État ni des titres RNCP.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-sm font-medium text-ink">{c.title}</p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted transition hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/harmonie-solutions-logo.png" alt="Harmonie Solutions" width={36} height={36} className="rounded-md" />
            <span>© <Year /> Harmonie Solutions</span>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link href="/legal/mentions" className="hover:text-ink">Mentions légales</Link></li>
            <li><Link href="/legal/confidentialite" className="hover:text-ink">Confidentialité</Link></li>
            <li><Link href="/legal/cookies" className="hover:text-ink">Cookies</Link></li>
            <li><Link href="/legal/cgv" className="hover:text-ink">Conditions de vente</Link></li>
            <li><Link href="/accessibilite" className="hover:text-ink">Accessibilité</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

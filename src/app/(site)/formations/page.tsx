import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog, getPaths } from "@/server/services/catalog";
import { PageIntro } from "@/components/marketing/page-intro";
import { Badge } from "@/components/ui/misc";
import { formatDuration, LEVEL_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Formations", description: "Le parcours Technicien support IT N1 et ses formations : métier et ITSM, poste de travail, réseau, identités et Microsoft 365." };

const ROADMAP = [
  { title: "Support IT N2", text: "Windows avancé, Active Directory, réseaux intermédiaires, Microsoft 365, Intune, Linux, virtualisation, supervision, ITSM avancé, support applicatif." },
  { title: "Support IT N3", text: "Diagnostic Windows Server, AD multi-sites, Kerberos, PKI, analyse de logs, Wireshark, haute disponibilité, gestion de crise." },
  { title: "Spécialisations sectorielles", text: "Industrie et IT/OT, logistique, retail et luxe, santé, banque, hôtellerie, collectivités." },
  { title: "Administration systèmes, réseaux, cybersécurité", text: "Windows Server, Linux, Cisco et routage, virtualisation, sécurité défensive, cloud et DevOps." },
];

export default async function FormationsPage() {
  const [catalog, paths] = await Promise.all([getCatalog(), getPaths()]);
  const total = catalog.reduce((a, c) => a + c.lessonCount, 0);
  return (
    <>
      <PageIntro title="Les formations">
        Un parcours complet et disponible aujourd&apos;hui, {paths[0]?.title ?? "Technicien support IT N1"}, en {catalog.length} formations et {total} leçons. Les parcours suivants
        sont annoncés avec leur programme ; ils ouvriront lorsque leurs leçons seront rédigées et relues.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">{paths[0]?.title}</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">{paths[0]?.summary}</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {catalog.map((c, i) => (
            <li key={c.slug}>
              <Link href={`/formations/${c.slug}`} className="block h-full rounded-[var(--radius-panel)] border border-line bg-surface p-6 transition hover:border-line-strong">
                <p className="text-sm tabular-nums text-muted">Étape {i + 1}</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">{c.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge>{LEVEL_LABELS[c.level]}</Badge>
                  <Badge>{c.lessonCount} leçons</Badge>
                  <Badge>{formatDuration(c.durationMin)}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Au programme</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">Ces parcours ne sont pas encore ouverts. Nous préférons publier moins, mais publier des leçons complètes.</p>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {ROADMAP.map((r) => (
              <li key={r.title} className="grid gap-2 py-5 md:grid-cols-[280px_1fr] md:gap-8">
                <p className="font-medium text-ink">{r.title}</p>
                <p className="text-[15px] leading-relaxed text-muted">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

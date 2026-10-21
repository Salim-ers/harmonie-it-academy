import Link from "next/link";
import { getCatalog } from "@/server/services/catalog";
import { PageIntro } from "@/components/marketing/page-intro";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "École du support IT", description: "Devenir technicien support N1, puis N2 et N3 : méthode, ITSM, Windows, réseau, identités, incidents simulés." };

const LEVELS = [
  { level: "N1", title: "Technicien support", text: "Accueillir, qualifier, diagnostiquer les incidents courants, résoudre ou escalader proprement. Le parcours est ouvert.", open: true },
  { level: "N2", title: "Technicien support confirmé", text: "Active Directory, GPO, réseaux intermédiaires, Microsoft 365, gestion de parc, Linux, virtualisation, supervision.", open: false },
  { level: "N3", title: "Spécialiste support", text: "Escalades complexes, analyse de causes profondes, Kerberos, PKI, réplication, haute disponibilité, gestion de crise.", open: false },
];

export default async function SupportSchool() {
  const catalog = (await getCatalog()).filter((c) => c.school === "support" || c.school === "infrastructure");
  return (
    <>
      <PageIntro title="L'école du support IT">
        Du premier ticket à l&apos;expertise. Le découpage N1, N2, N3 est un modèle pédagogique : dans la réalité, chaque entreprise répartit ces responsabilités à sa façon, et
        nous le disons dans chaque leçon.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ol className="grid gap-4 lg:grid-cols-3">
          {LEVELS.map((l) => (
            <li key={l.level} className={l.open ? "rounded-[var(--radius-panel)] bg-ink p-6 text-paper" : "rounded-[var(--radius-panel)] border border-line p-6"}>
              <p className={`font-display text-5xl ${l.open ? "" : "text-muted"}`}>{l.level}</p>
              <p className="mt-3 font-medium">{l.title}</p>
              <p className={`mt-2 text-[15px] leading-relaxed ${l.open ? "text-paper/75" : "text-muted"}`}>{l.text}</p>
              <p className={`mt-4 text-sm ${l.open ? "text-paper" : "text-muted"}`}>{l.open ? "Disponible" : "En préparation"}</p>
            </li>
          ))}
        </ol>
        <h2 className="mt-16 text-2xl font-semibold tracking-tight">Le parcours N1 en détail</h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {catalog.map((c) => (
            <li key={c.slug}>
              <Link href={`/formations/${c.slug}`} className="grid gap-2 py-5 hover:bg-mist/40 md:grid-cols-[320px_1fr_auto] md:items-center md:gap-8">
                <span className="font-medium">{c.title}</span>
                <span className="text-[15px] text-muted">{c.modules.flatMap((m) => m.lessons).map((l) => l.title).slice(0, 4).join(" ; ")}…</span>
                <span className="text-sm tabular-nums text-muted">{c.lessonCount} leçons</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/inscription">Commencer gratuitement</ButtonLink>
          <ButtonLink href="/laboratoires" variant="secondary">
            Voir les incidents simulés
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

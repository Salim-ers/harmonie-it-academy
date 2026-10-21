import Link from "next/link";
import { getPublicScenarios } from "@/server/services/catalog";
import { PageIntro } from "@/components/marketing/page-intro";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { SECTOR_LABELS } from "@/lib/format";

export const metadata = { title: "Laboratoires", description: "Incidents d'entreprise simulés : interrogez, testez, diagnostiquez, corrigez et documentez, sans risque." };

export default async function LabsPublic() {
  const scenarios = await getPublicScenarios();
  return (
    <>
      <PageIntro title="Harmonie Labs">
        Un utilisateur appelle, un ticket arrive. Vous choisissez quoi vérifier, chaque test répond de façon cohérente avec la vraie cause, et les gestes dangereux sont expliqués au
        lieu d&apos;être cachés. À la fin : un débrief noté et un compte rendu que vous pouvez montrer.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
          {scenarios.map((s) => (
            <li key={s.slug} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted">{s.summary}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                <Badge>{SECTOR_LABELS[s.sector] ?? s.sector}</Badge>
                {s.requiredTier === 0 ? <Badge tone="ok">Gratuit</Badge> : <Badge tone="gold">{s.requiredTier === 1 ? "Academy" : "Academy Pro"}</Badge>}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href="/inscription?suite=/campus/laboratoires/zebra-quai-3">Essayer un laboratoire gratuit</ButtonLink>
          <Link href="/methode" className="text-sm text-ink hover:underline">
            Comment les laboratoires sont notés
          </Link>
        </div>
      </section>
    </>
  );
}

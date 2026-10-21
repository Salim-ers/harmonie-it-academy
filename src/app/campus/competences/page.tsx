import { requireUser } from "@/server/auth/session";
import { getSkillMap, EVIDENCE_WEIGHTS, MIN_CONFIDENT_WEIGHT } from "@/server/services/skills";
import { SkillDomains } from "@/components/campus/skill-domains";
import { PageHeader, Panel } from "@/components/ui/misc";
import { SKILL_DOMAINS } from "@/content/skills";
import { cn } from "@/lib/cn";

export const metadata = { title: "Compétences" };

const SOURCE_LABELS: Record<string, string> = { quiz: "quiz", exercise: "exercice", interview: "entretien", scenario: "laboratoire", exam: "examen", mentor: "mentor" };

export default async function SkillsPage() {
  const u = await requireUser("/campus/competences");
  const map = await getSkillMap(u.id);
  return (
    <div className="space-y-8">
      <PageHeader title="Carte de compétences" description="Vos niveaux sont calculés à partir de vos résultats réels. Rien n'est déclaratif : chaque pourcentage s'appuie sur des preuves que vous pouvez retrouver." />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {(Object.keys(SKILL_DOMAINS) as (keyof typeof SKILL_DOMAINS)[]).map((d) => {
            const skills = map.skills.filter((s) => s.domain === d);
            if (!skills.length) return null;
            return (
              <Panel key={d} className="overflow-hidden">
                <h2 className="border-b border-line px-5 py-3 font-medium">{SKILL_DOMAINS[d]}</h2>
                <ul className="divide-y divide-line">
                  {skills.map((s) => (
                    <li key={s.code} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[1fr_220px] sm:items-center sm:gap-6">
                      <div>
                        <p className="text-[15px] text-ink">{s.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {s.evidenceCount
                            ? Object.entries(s.bySource)
                                .map(([k, n]) => `${n} ${SOURCE_LABELS[k]}${(n ?? 0) > 1 ? "s" : ""}`)
                                .join(", ")
                            : "Aucune preuve pour l'instant"}
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className={cn("tabular-nums", s.level === null ? "text-muted" : "text-ink")}>{s.level === null ? "—" : `${s.level} %`}</span>
                          {s.level !== null && !s.confident ? <span className="text-xs text-muted">à confirmer</span> : null}
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
                          <div className={cn("h-full rounded-full", s.confident ? "bg-ok" : "bg-line-strong")} style={{ width: `${s.level ?? 0}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
        <aside className="space-y-5">
          <Panel className="p-5">
            <h2 className="font-medium">Vue par domaine</h2>
            <SkillDomains domains={map.domains} className="mt-4" />
          </Panel>
          <Panel className="p-5 text-sm leading-relaxed text-ink-2">
            <h2 className="font-medium text-ink">Comment ces pourcentages sont calculés</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-4">
              <li>Chaque quiz, exercice, laboratoire, entretien ou examen évalué produit une preuve de 0 à 100 pour les compétences concernées.</li>
              <li>
                Les preuves sont pondérées selon leur exigence : quiz {EVIDENCE_WEIGHTS.quiz}, entretien {EVIDENCE_WEIGHTS.interview}, exercice {EVIDENCE_WEIGHTS.exercise}, laboratoire {EVIDENCE_WEIGHTS.scenario}, examen {EVIDENCE_WEIGHTS.exam}.
              </li>
              <li>Refaire une évaluation remplace son ancienne preuve : le niveau reflète ce que vous savez aujourd&apos;hui.</li>
              <li>En dessous d&apos;un poids total de {MIN_CONFIDENT_WEIGHT}, le niveau est affiché « à confirmer » et en gris.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

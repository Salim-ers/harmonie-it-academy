import { requireStudio } from "@/server/auth/session";
import { can } from "@/server/authz/policies";
import { getPlatformAnalytics } from "@/server/services/studio";
import { PageHeader, Panel, Stat } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: { absolute: "Vue d'ensemble — Harmonie Studio" } };

export default async function StudioHome() {
  const { actor, user } = await requireStudio();
  if (!can.viewPlatformAnalytics(actor)) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Bonjour ${user.name.split(" ")[0]}`} description="Vous accédez aux contenus et aux apprenants des formations qui vous sont affectées." />
        <div className="flex gap-2">
          <ButtonLink href="/studio/contenus">Mes contenus</ButtonLink>
          <ButtonLink href="/studio/revues" variant="secondary">
            Relectures en attente
          </ButtonLink>
        </div>
      </div>
    );
  }
  const a = await getPlatformAnalytics(actor);
  return (
    <div className="space-y-8">
      <PageHeader title="Vue d'ensemble" description="Indicateurs agrégés. Aucune donnée individuelle n'est affichée ici." />
      <Panel className="grid gap-6 p-6 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Inscrits" value={a.users} />
        <Stat label="Nouveaux (30 j)" value={a.newUsers30} />
        <Stat label="Abonnements actifs" value={a.activeSubscriptions} />
        <Stat label="Encaissé (30 j)" value={(a.revenue30Cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} />
        <Stat label="Incidents clôturés" value={a.labsClosed} sub={a.labsClosed ? `score moyen ${a.labsAvg}` : undefined} />
        <Stat label="Demandes ouvertes" value={a.openTickets} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <h2 className="px-5 pt-4 font-medium">Progression par leçon</h2>
          <p className="px-5 text-sm text-muted">Commencées, terminées, et temps moyen. Un écart fort signale un abandon.</p>
          <div className="mt-3 max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-y border-line text-left text-muted">
                  <th className="px-5 py-2 font-normal">Leçon</th>
                  <th className="px-3 py-2 text-right font-normal">Débutées</th>
                  <th className="px-3 py-2 text-right font-normal">Terminées</th>
                  <th className="px-5 py-2 text-right font-normal">Temps moyen</th>
                </tr>
              </thead>
              <tbody>
                {a.lessonFunnel.map((l) => (
                  <tr key={l.slug} className="border-b border-line last:border-0">
                    <td className="px-5 py-2 text-ink">{l.title}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.started}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.completed}
                      {l.started ? <span className="ml-1 text-xs text-muted">({Math.round((l.completed / l.started) * 100)} %)</span> : null}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums text-muted">{l.avg_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <h2 className="px-5 pt-4 font-medium">Questions les plus ratées</h2>
            {a.failedQuestions.length ? (
              <ul className="mt-3 divide-y divide-line text-sm">
                {a.failedQuestions.map((q) => (
                  <li key={q.code} className="flex justify-between gap-4 px-5 py-2.5">
                    <span className="line-clamp-2 text-ink-2">{q.prompt}</span>
                    <span className="shrink-0 tabular-nums">{q.success} %</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-4 pt-2 text-sm text-muted">Pas encore assez de réponses (3 minimum par question).</p>
            )}
          </Panel>
          <Panel className="overflow-hidden">
            <h2 className="px-5 pt-4 font-medium">Évaluations</h2>
            {a.assessmentStats.length ? (
              <ul className="mt-3 divide-y divide-line text-sm">
                {a.assessmentStats.map((s) => (
                  <li key={s.title} className="flex justify-between gap-4 px-5 py-2.5">
                    <span className="text-ink-2">{s.title}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {s.attempts} tentatives, {s.pass_rate} % de réussite
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-4 pt-2 text-sm text-muted">Aucune tentative pour l&apos;instant.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

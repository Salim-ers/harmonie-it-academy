import { requireStudio } from "@/server/auth/session";
import { can } from "@/server/authz/policies";
import { getQualityIndicators } from "@/server/services/studio";
import { getSatisfactionReport } from "@/server/services/satisfaction";
import { formatDate } from "@/lib/format";
import { EmptyState, PageHeader, Panel, Stat } from "@/components/ui/misc";

export const metadata = { title: "Harmonie Quality" };

const CRITERIA = [
  ["Information du public", "Pages publiques, tarifs, prérequis et objectifs par leçon ; aucune reconnaissance affichée sans être obtenue."],
  ["Identification des objectifs et adaptation", "Objectifs mesurables par leçon, positionnement initial, déclaration des besoins d'adaptation."],
  ["Adaptation et suivi", "Traçabilité des inscriptions, de la progression, du temps d'apprentissage et des évaluations initiales et finales."],
  ["Moyens pédagogiques", "Contenus versionnés, relus techniquement et pédagogiquement, références datées."],
  ["Qualification des intervenants", "Rôles et affectations des formateurs ; suivi des compétences des intervenants à documenter."],
  ["Environnement professionnel", "Laboratoires sectoriels, préparation à l'entretien, passeport de compétences."],
  ["Recueil des appréciations et amélioration", "Questionnaires de satisfaction, réclamations, indicateurs d'abandon par leçon."],
];

export default async function QualityPage() {
  const { actor } = await requireStudio("/studio/qualite");
  if (!can.viewPlatformAnalytics(actor)) return <EmptyState title="Accès réservé au responsable pédagogique" />;
  const [q, sat] = await Promise.all([getQualityIndicators(actor), getSatisfactionReport(actor)]);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Harmonie Quality"
        description="Pilotage de la qualité pédagogique à partir des données réellement produites par la plateforme. Ce tableau aide à préparer un audit ; il ne vaut pas certification et ne génère aucune preuve fictive."
      />
      <Panel className="grid gap-6 p-6 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Apprenants" value={q.learners} />
        <Stat label="Positionnement initial" value={q.placementRate === null ? "—" : `${q.placementRate} %`} sub="des apprenants" />
        <Stat label="Formations terminées" value={q.completionRate === null ? "—" : `${q.completionRate} %`} sub={`${q.enrollments} inscriptions`} />
        <Stat label="Satisfaction" value={q.satisfaction?.n ? `${q.satisfaction.avg} / 5` : "—"} sub={q.satisfaction?.n ? `${q.satisfaction.n} réponses, ${q.satisfaction.useful} % utile pour l'emploi` : "aucune réponse"} />
        <Stat label="Réclamations" value={q.complaints} sub={`${q.complaintsClosed} traitées`} />
        <Stat label="Examen final" value={q.exam.attempts ? `${q.exam.pass_rate} %` : "—"} sub={`${q.exam.attempts} tentative(s)`} />
        <Stat label="Demandes d'adaptation" value={q.adaptationRequests} />
      </Panel>
      <Panel className="p-5" as="section">
        <h2 className="font-medium">Appréciations des apprenants</h2>
        <p className="mt-1 text-sm text-muted">Demandées à mi-parcours de chaque formation, modifiables par l&apos;apprenant, affichées ici sans identité.</p>
        {sat.byCourse.length ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-2 font-normal">Formation</th>
                  <th className="py-2 text-right font-normal">Réponses</th>
                  <th className="py-2 text-right font-normal">Note</th>
                  <th className="py-2 text-right font-normal">Utile pour l&apos;emploi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sat.byCourse.map((c) => (
                  <tr key={c.title}>
                    <td className="py-2 text-ink">{c.title}</td>
                    <td className="py-2 text-right tabular-nums">{c.n}</td>
                    <td className="py-2 text-right tabular-nums">{c.avg} / 5</td>
                    <td className="py-2 text-right tabular-nums">{c.useful === null ? "—" : `${c.useful} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="space-y-3 text-sm">
              {sat.comments.length ? (
                sat.comments.map((c, i) => (
                  <li key={i} className="rounded-[var(--radius-control)] border border-line p-3">
                    <p className="text-xs text-muted">
                      {c.course}, {c.rating} / 5, {formatDate(c.at)}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-ink-2">{c.comment}</p>
                  </li>
                ))
              ) : (
                <li className="text-muted">Aucun commentaire écrit pour l&apos;instant.</li>
              )}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Aucune réponse pour l&apos;instant.</p>
        )}
      </Panel>
      <Panel className="overflow-hidden" as="section">
        <h2 className="px-5 pt-4 font-medium">Où trouver les éléments de preuve</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {CRITERIA.map(([t, d]) => (
            <li key={t} className="grid gap-1 px-5 py-3 md:grid-cols-[300px_1fr] md:gap-6">
              <span className="text-ink">{t}</span>
              <span className="text-ink-2">{d}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">
          Référence : guide de lecture du Référentiel national qualité publié par le ministère du Travail, à vérifier à la date de l&apos;audit. Les démarches (NDA, Qualiopi, RNCP/RS,
          CPF) sont distinctes et se mènent auprès des organismes compétents.
        </p>
      </Panel>
      <a href="/api/studio/qualite/export" className="inline-flex h-10 items-center rounded-[var(--radius-control)] border border-line-strong px-4 text-sm font-medium hover:border-ink-2">
        Exporter les données de suivi (CSV)
      </a>
    </div>
  );
}

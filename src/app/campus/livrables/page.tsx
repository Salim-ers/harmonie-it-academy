import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listAssignmentsForLearner, MONTHLY_SUBMISSIONS } from "@/server/services/mentoring";
import { Badge, PageHeader, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Livrables et mentor" };

const STATUS = { submitted: { l: "En attente de relecture", t: "signal" }, in_review: { l: "En cours de relecture", t: "signal" }, reviewed: { l: "Relu", t: "ok" } } as const;

export default async function AssignmentsPage() {
  const u = await requireUser("/campus/livrables");
  const { items, tier, remaining } = await listAssignmentsForLearner(u.id);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Livrables et mentor"
        description="Des écrits de technicien, relus par une personne : compte rendu d'incident, article pour les utilisateurs, procédure, présentation d'entretien. La relecture suit une grille affichée à l'avance et devient une preuve de compétence."
      />
      <Panel className="p-5 text-sm text-ink-2">
        {tier >= 2
          ? `Academy Pro : ${remaining} relecture${remaining > 1 ? "s" : ""} disponible${remaining > 1 ? "s" : ""} sur ${MONTHLY_SUBMISSIONS} par période de 30 jours. Les relectures sont faites par l'équipe pédagogique selon sa disponibilité ; aucun délai n'est garanti.`
          : "La relecture par un mentor est incluse dans l'offre Academy Pro. Vous pouvez lire les consignes et les grilles dès maintenant pour vous entraîner."}
      </Panel>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((a) => (
          <li key={a.id}>
            <Link href={`/campus/livrables/${a.slug}`} className="block h-full rounded-[var(--radius-panel)] border border-line bg-surface p-5 transition hover:border-line-strong">
              <p className="font-medium text-ink">{a.title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {a.latest ? (
                  <>
                    <Badge tone={STATUS[a.latest.status].t}>{STATUS[a.latest.status].l}</Badge>
                    {a.latest.status === "reviewed" && a.latest.score !== null ? <span className="tabular-nums text-muted">{Math.round(a.latest.score)} / 100</span> : null}
                    <span className="text-muted">envoyé le {formatDate(a.latest.createdAt, { day: "numeric", month: "short" })}</span>
                  </>
                ) : (
                  <span className="text-muted">Pas encore envoyé</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

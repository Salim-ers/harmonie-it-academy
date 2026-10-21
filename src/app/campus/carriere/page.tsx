import Link from "next/link";
import { FileSearch, FileText, IdCard, MessagesSquare } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { interviewQuota, listInterviews, listJobAnalyses, getOrCreatePassport } from "@/server/services/career";
import { OfferForm } from "@/components/career/offer-form";
import { InterviewSetup } from "@/components/career/interview-setup";
import { Badge, PageHeader, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, type InterviewRole } from "@/content/career-schema";

export const metadata = { title: "Carrière et entretiens" };

export default async function CareerPage() {
  const u = await requireUser("/campus/carriere");
  const [analyses, interviews, quota, passport] = await Promise.all([listJobAnalyses(u.id), listInterviews(u.id), interviewQuota(u.id), getOrCreatePassport(u.id)]);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Harmonie Career"
        description="Préparez une candidature précise : analysez l'offre, entraînez-vous sur les questions qui comptent, et partagez des preuves plutôt que des promesses."
      />

      <Panel className="p-6" as="section">
        <h2 className="flex items-center gap-2 font-medium">
          <FileSearch className="h-4 w-4 text-signal" aria-hidden="true" /> Analyser une offre d&apos;emploi
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Vous verrez les compétences demandées, ce que vous avez déjà prouvé sur la plateforme, ce qui n&apos;y est pas encore couvert, et un plan de préparation jour par jour
          jusqu&apos;à l&apos;entretien.
        </p>
        <div className="mt-5">
          <OfferForm />
        </div>
        {analyses.length ? (
          <ul className="mt-6 divide-y divide-line border-t border-line text-sm">
            {analyses.map((a) => (
              <li key={a.id}>
                <Link href={`/campus/carriere/offres/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:underline">
                  <span className="text-ink">{a.title}</span>
                  <span className="text-muted">
                    {a.interviewDate ? `Entretien le ${formatDate(a.interviewDate, { day: "numeric", month: "short" })}` : formatDate(a.createdAt, { day: "numeric", month: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between" as="section">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-signal" aria-hidden="true" /> Relire mon CV
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Lisibilité, faits mesurables, données personnelles inutiles, compétences prouvées à ajouter et affirmations à préparer, comparaison avec l&apos;offre visée. Votre CV
            n&apos;est pas enregistré.
          </p>
        </div>
        <Link href="/campus/carriere/cv" className="shrink-0 text-sm font-medium text-ink hover:underline">
          Relire mon CV
        </Link>
      </Panel>

      <Panel className="p-6" as="section">
        <h2 className="flex items-center gap-2 font-medium">
          <MessagesSquare className="h-4 w-4 text-signal" aria-hidden="true" /> Simuler un entretien
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Répondez par écrit comme à l&apos;oral. Chaque réponse est comparée à une grille explicite (notions attendues, formulations à risque, structure) puis à une réponse modèle. La
          grille ne prétend pas reproduire le jugement d&apos;un recruteur.
        </p>
        <div className="mt-5">
          <InterviewSetup quotaText={quota.unlimited ? "Simulations illimitées avec Academy Pro." : `${quota.remaining} simulation gratuite restante sur 30 jours.`} />
        </div>
        {interviews.length ? (
          <ul className="mt-6 divide-y divide-line border-t border-line text-sm">
            {interviews.map((s) => (
              <li key={s.id}>
                <Link href={`/campus/carriere/entretiens/${s.id}`} className="flex items-center justify-between gap-3 py-3 hover:underline">
                  <span className="text-ink">
                    {ROLE_LABELS[s.role as InterviewRole] ?? s.role}, {s.kind}, {s.lang === "en" ? "anglais" : "français"}
                  </span>
                  <span className="flex items-center gap-2 text-muted">
                    {formatDate(s.startedAt, { day: "numeric", month: "short" })}
                    {s.status === "completed" ? <Badge tone={(s.score ?? 0) >= 70 ? "ok" : "warn"}>{s.score} %</Badge> : <Badge tone="signal">En cours</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between" as="section">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <IdCard className="h-4 w-4 text-signal" aria-hidden="true" /> Passeport de compétences
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Une page publique, désactivée par défaut, qui présente vos niveaux prouvés, vos attestations et les incidents que vous choisissez de montrer.
          </p>
        </div>
        <Link href="/campus/carriere/passeport" className="text-sm font-medium text-ink hover:underline">
          {passport.enabled ? "Gérer mon passeport (public)" : "Configurer mon passeport"}
        </Link>
      </Panel>
    </div>
  );
}

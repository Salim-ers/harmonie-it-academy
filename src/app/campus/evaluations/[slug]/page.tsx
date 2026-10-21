import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getPublicAssessments } from "@/server/services/catalog";
import { getAttemptHistory } from "@/server/services/assessments";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { StartAttempt } from "@/components/assessment/start-attempt";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/misc";

export default async function AssessmentIntro(props: PageProps<"/campus/evaluations/[slug]">) {
  const { slug } = await props.params;
  const u = await requireUser(`/campus/evaluations/${slug}`);
  const a = (await getPublicAssessments()).find((x) => x.slug === slug);
  if (!a) notFound();
  const [tier, history] = await Promise.all([getUserTier(u.id), getAttemptHistory(u.id)]);
  const mine = history.filter((h) => h.slug === slug);
  const open = mine.find((h) => h.status === "in_progress");
  const used = mine.filter((h) => h.status !== "in_progress").length;
  const remaining = a.maxAttempts ? a.maxAttempts - used : null;
  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/campus/evaluations" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Quiz et examens
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{a.title}</h1>
      <p className="text-[15px] leading-relaxed text-ink-2">{a.description}</p>
      <Panel className="p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Durée</dt>
            <dd className="mt-0.5 font-medium">{a.timeLimitMin ? `${a.timeLimitMin} minutes` : "Libre"}</dd>
          </div>
          <div>
            <dt className="text-muted">Seuil de réussite</dt>
            <dd className="mt-0.5 font-medium">{a.kind === "placement" ? "Aucun" : `${a.passPercent} %`}</dd>
          </div>
          <div>
            <dt className="text-muted">Tentatives</dt>
            <dd className="mt-0.5 font-medium">{remaining === null ? "Illimitées" : `${remaining} restante(s) sur ${a.maxAttempts}`}</dd>
          </div>
        </dl>
        {a.kind === "exam" ? (
          <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
            La réussite donne lieu à une attestation interne Harmonie IT Academy, vérifiable en ligne. Ce n&apos;est ni un diplôme d&apos;État, ni un titre RNCP, ni une
            certification d&apos;éditeur. Le minuteur démarre dès que vous commencez ; vos réponses sont enregistrées au fil de l&apos;eau.
          </p>
        ) : null}
        <div className="mt-6">
          {tier < a.requiredTier ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">Inclus dans l&apos;offre {TIER_LABELS[a.requiredTier]}.</p>
              <ButtonLink href="/campus/facturation">Voir les offres</ButtonLink>
            </div>
          ) : open ? (
            <ButtonLink href={`/campus/evaluations/tentatives/${open.id}`} size="lg">
              Reprendre la tentative en cours
            </ButtonLink>
          ) : remaining === 0 ? (
            <p className="text-sm text-muted">Toutes les tentatives ont été utilisées. Contactez le support pédagogique si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.</p>
          ) : (
            <StartAttempt slug={slug} label={a.kind === "placement" ? "Commencer le positionnement" : "Commencer"} />
          )}
        </div>
      </Panel>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { requireStudio } from "@/server/auth/session";
import { getSubmissionForReview } from "@/server/services/mentoring";
import { ForbiddenError } from "@/server/authz/policies";
import { ClaimButton, ReviewForm } from "@/components/mentoring/review-form";
import { PageHeader, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export default async function ReviewPage(props: PageProps<"/studio/livrables/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { actor } = await requireStudio(`/studio/livrables/${id}`);
  let data;
  try {
    data = await getSubmissionForReview(actor, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  const { s, a, learner, rubric } = data;
  return (
    <div className="space-y-8">
      <Link href="/studio/livrables" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Livrables à relire
      </Link>
      <PageHeader title={a.title} description={`${learner}, envoyé le ${formatDate(s.createdAt)}`} />
      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Panel className="p-6" as="section">
            <h2 className="font-medium">Texte de l&apos;apprenant</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink">{s.body}</p>
          </Panel>
          <details className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 text-sm">
            <summary className="cursor-pointer font-medium">Consigne donnée</summary>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{a.brief}</p>
          </details>
        </div>
        <Panel className="h-fit p-6" as="section">
          {s.status === "submitted" ? (
            <ClaimButton id={s.id} />
          ) : s.status === "in_review" && s.reviewerId === actor.id ? (
            <ReviewForm id={s.id} rubric={rubric} />
          ) : s.status === "in_review" ? (
            <p className="text-sm text-muted">Un autre membre de l&apos;équipe relit ce livrable.</p>
          ) : (
            <p className="text-sm text-muted">Relu le {s.reviewedAt ? formatDate(s.reviewedAt) : ""}.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

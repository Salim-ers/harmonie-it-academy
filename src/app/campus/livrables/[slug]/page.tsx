import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getAssignmentForLearner } from "@/server/services/mentoring";
import { AssignmentForm } from "@/components/mentoring/assignment-form";
import { Badge, PageHeader, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export default async function AssignmentPage(props: PageProps<"/campus/livrables/[slug]">) {
  const { slug } = await props.params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const u = await requireUser(`/campus/livrables/${slug}`);
  const data = await getAssignmentForLearner(u.id, slug);
  if (!data) notFound();
  const { assignment: a, history, tier, remaining } = data;
  const pending = history.some((h) => h.status !== "reviewed");
  const disabledReason =
    tier < a.requiredTier
      ? "La relecture par un mentor est incluse dans l'offre Academy Pro. Vous pouvez rédiger votre texte pour vous entraîner avec la grille ci-contre."
      : pending
        ? "Une version de ce livrable attend sa relecture. Vous pourrez en envoyer une nouvelle ensuite."
        : remaining === 0
          ? "Vous avez utilisé les relectures de la période de 30 jours en cours."
          : null;
  const total = a.rubric.reduce((s, r) => s + r.points, 0);
  return (
    <div className="space-y-8">
      <Link href="/campus/livrables" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Livrables et mentor
      </Link>
      <PageHeader title={a.title} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel className="space-y-3 p-6 text-[15px] leading-relaxed text-ink-2" as="section">
            <h2 className="font-medium text-ink">Consigne</h2>
            {a.brief.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </Panel>
          <Panel className="p-6" as="section">
            <AssignmentForm slug={a.slug} disabledReason={disabledReason} />
          </Panel>
          {history.length ? (
            <section className="space-y-4" aria-labelledby="historique">
              <h2 id="historique" className="font-medium text-ink">
                Vos envois
              </h2>
              {history.map((h) => (
                <Panel key={h.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={h.status === "reviewed" ? "ok" : "signal"}>{h.status === "reviewed" ? "Relu" : h.status === "in_review" ? "En cours de relecture" : "En attente"}</Badge>
                    <span className="text-muted">Envoyé le {formatDate(h.createdAt)}</span>
                    {h.status === "reviewed" && h.score !== null ? <span className="ml-auto font-medium tabular-nums">{Math.round(h.score)} / 100</span> : null}
                  </div>
                  {h.feedback ? (
                    <div className="mt-4 rounded-[var(--radius-control)] border border-ok/25 bg-ok-wash/40 p-4">
                      <p className="text-sm font-medium text-ink">Retour du mentor{h.reviewedAt ? `, le ${formatDate(h.reviewedAt)}` : ""}</p>
                      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{h.feedback}</p>
                    </div>
                  ) : null}
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted hover:text-ink">Voir le texte envoyé</summary>
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-2">{h.body}</p>
                  </details>
                </Panel>
              ))}
            </section>
          ) : null}
        </div>
        <aside>
          <Panel className="p-5" as="section">
            <h2 className="text-sm font-medium">Grille de relecture</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {a.rubric.map((r) => (
                <li key={r.criterion} className="flex justify-between gap-3">
                  <span className="text-ink-2">{r.criterion}</span>
                  <span className="shrink-0 tabular-nums text-muted">{r.points} pts</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">Total {total} points, ramené sur 100. La note compte comme une preuve forte sur votre carte de compétences.</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

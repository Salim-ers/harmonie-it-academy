import Link from "next/link";
import { Lock } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getPublicAssessments } from "@/server/services/catalog";
import { getAttemptHistory } from "@/server/services/assessments";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { Badge, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Quiz et examens" };

const KIND = { placement: "Positionnement", exercise: "Exercices pratiques", mock_exam: "Examens blancs", exam: "Examens" } as const;

export default async function EvaluationsPage() {
  const u = await requireUser("/campus/evaluations");
  const [list, history, tier] = await Promise.all([getPublicAssessments(), getAttemptHistory(u.id), getUserTier(u.id)]);
  return (
    <div className="space-y-10">
      <PageHeader title="Quiz et examens" description="Exercices corrigés, examen blanc et examen final. Les quiz de chaque leçon se trouvent dans la leçon elle-même." />
      {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => {
        const items = list.filter((a) => a.kind === k);
        if (!items.length) return null;
        return (
          <section key={k} aria-labelledby={`k-${k}`}>
            <h2 id={`k-${k}`} className="mb-3 font-medium">
              {KIND[k]}
            </h2>
            <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
              {items.map((a) => {
                const tries = history.filter((h) => h.slug === a.slug && h.status !== "in_progress");
                const best = tries.reduce<number | null>((m, t) => (t.percent !== null && (m === null || t.percent > m) ? t.percent : m), null);
                const locked = tier < a.requiredTier;
                return (
                  <li key={a.slug}>
                    <Link href={`/campus/evaluations/${a.slug}`} className="grid gap-1 px-5 py-4 transition hover:bg-mist/50 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                      <div>
                        <p className="flex items-center gap-2 font-medium text-ink">
                          {locked ? <Lock className="h-3.5 w-3.5 text-muted" aria-label="Réservé" /> : null}
                          {a.title}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">{a.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        {a.timeLimitMin ? <Badge>{a.timeLimitMin} min</Badge> : null}
                        {locked ? <Badge tone="gold">{TIER_LABELS[a.requiredTier]}</Badge> : best !== null ? <Badge tone={best >= a.passPercent ? "ok" : "warn"}>Meilleur : {best} %</Badge> : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {history.length ? (
        <section aria-labelledby="hist">
          <h2 id="hist" className="mb-3 font-medium">
            Historique
          </h2>
          <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface text-sm">
            {history.slice(0, 20).map((h) => (
              <li key={h.id}>
                <Link href={`/campus/evaluations/tentatives/${h.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-mist/50">
                  <span className="text-ink">{h.title}</span>
                  <span className="flex items-center gap-3 text-muted">
                    {formatDate(h.submittedAt ?? h.startedAt, { day: "numeric", month: "short" })}
                    {h.status === "in_progress" ? <Badge tone="signal">En cours</Badge> : <Badge tone={h.passed ? "ok" : "warn"}>{h.percent} %</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

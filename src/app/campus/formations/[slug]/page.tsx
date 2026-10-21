import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, Circle, Lock } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getCourse } from "@/server/services/catalog";
import { getProgressMap } from "@/server/services/progress";
import { getUserTier } from "@/server/services/entitlements";
import { Badge, PageHeader, ProgressBar } from "@/components/ui/misc";
import { formatDuration } from "@/lib/format";
import { getMySatisfaction } from "@/server/services/satisfaction";
import { SatisfactionForm } from "@/components/campus/satisfaction-form";

export default async function CoursePage(props: PageProps<"/campus/formations/[slug]">) {
  const { slug } = await props.params;
  const u = await requireUser(`/campus/formations/${slug}`);
  const course = await getCourse(slug);
  if (!course) notFound();
  const [progress, tier, satisfaction] = await Promise.all([getProgressMap(u.id), getUserTier(u.id), getMySatisfaction(u.id, course.id)]);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const done = lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
  return (
    <div className="space-y-8">
      <Link href="/campus/formations" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Mes formations
      </Link>
      <PageHeader title={course.title} description={course.summary} />
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          {course.modules.map((m, mi) => (
            <section key={m.id} aria-labelledby={`m-${m.id}`}>
              <h2 id={`m-${m.id}`} className="mb-3 text-sm text-muted">
                Module {mi + 1}. <span className="font-medium text-ink">{m.title}</span>
              </h2>
              <ol className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
                {m.lessons.map((l) => {
                  const st = progress.get(l.id)?.status;
                  const locked = tier < l.requiredTier;
                  return (
                    <li key={l.id}>
                      <Link href={`/campus/cours/${l.slug}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-mist/50">
                        {st === "completed" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label="Terminée" /> : locked ? <Lock className="h-4 w-4 shrink-0 text-muted" aria-label="Réservée" /> : <Circle className="h-4 w-4 shrink-0 text-line-strong" aria-hidden="true" />}
                        <span className="flex-1 text-[15px] text-ink">{l.title}</span>
                        {st === "started" ? <Badge tone="signal">Commencée</Badge> : null}
                        {l.requiredTier === 0 && tier === 0 ? <Badge tone="ok">Gratuite</Badge> : null}
                        <span className="shrink-0 text-sm text-muted">{formatDuration(l.durationMin)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
        <aside className="space-y-5">
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <p className="text-sm text-muted">Progression</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {done}/{lessons.length}
            </p>
            <ProgressBar value={lessons.length ? (done / lessons.length) * 100 : 0} label="Progression de la formation" className="mt-3" />
          </div>
          {satisfaction.eligible ? (
            <section aria-labelledby="avis" className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
              <h2 id="avis" className="text-sm font-medium">
                Votre avis sur cette formation
              </h2>
              <p className="mt-1 text-sm text-muted">Lu par l&apos;équipe pédagogique, sans votre nom. Il sert à améliorer les leçons.</p>
              <div className="mt-4">
                <SatisfactionForm courseId={course.id} answer={satisfaction.answer} />
              </div>
            </section>
          ) : null}
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <p className="text-sm font-medium">Objectifs</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              {course.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

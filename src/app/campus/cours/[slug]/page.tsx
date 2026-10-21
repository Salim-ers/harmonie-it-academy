import { frenchSpacing } from "@/lib/typography";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Lock } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getPublishedLesson } from "@/server/services/catalog";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { getLessonProgress, getProgressMap } from "@/server/services/progress";
import { getPublicQuiz } from "@/server/services/assessments";
import { getDb } from "@/server/db";
import { assessments, attempts } from "@/server/db/schema";
import { StaticBlock } from "@/components/lesson/blocks";
import { QuizBlock } from "@/components/lesson/quiz-block";
import { ExerciseBlock } from "@/components/lesson/exercise-block";
import { LessonTracker } from "@/components/lesson/lesson-tracker";
import { ResumeBanner } from "@/components/lesson/resume-banner";
import { CompleteLesson } from "@/components/lesson/complete-lesson";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Panel } from "@/components/ui/misc";
import { formatDate, formatDuration, LEVEL_LABELS } from "@/lib/format";
import { cn } from "@/lib/cn";

export async function generateMetadata(props: PageProps<"/campus/cours/[slug]">) {
  const { slug } = await props.params;
  const l = await getPublishedLesson(slug);
  return { title: l?.title ?? "Leçon" };
}

export default async function LessonPage(props: PageProps<"/campus/cours/[slug]">) {
  const { slug } = await props.params;
  const u = await requireUser(`/campus/cours/${slug}`);
  const lesson = await getPublishedLesson(slug);
  if (!lesson) notFound();
  const [tier, progress, progressMap] = await Promise.all([getUserTier(u.id), getLessonProgress(u.id, lesson.id), getProgressMap(u.id)]);
  const locked = tier < lesson.requiredTier;
  const { meta, blocks } = lesson.doc;

  const outline = (
    <nav aria-label="Plan de la formation" className="space-y-5 text-sm">
      <Link href={`/campus/formations/${lesson.course.slug}`} className="block font-medium text-ink hover:underline">
        {lesson.course.title}
      </Link>
      {lesson.course.modules.map((m) => (
        <div key={m.id}>
          <p className="mb-1.5 text-xs text-muted">{m.title}</p>
          <ul className="space-y-0.5">
            {m.lessons.map((l) => {
              const st = progressMap.get(l.id)?.status;
              const current = l.slug === slug;
              return (
                <li key={l.id}>
                  <Link
                    href={`/campus/cours/${l.slug}`}
                    aria-current={current ? "page" : undefined}
                    className={cn("flex items-start gap-2 rounded-md px-2 py-1.5 leading-snug transition", current ? "bg-mist font-medium text-ink" : "text-ink-2 hover:bg-mist/60")}
                  >
                    {st === "completed" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-label="Terminée" /> : tier < l.requiredTier ? <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-label="Réservée" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-line-strong" aria-hidden="true" />}
                    <span>{l.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const header = (
    <header className="max-w-[78ch] space-y-4 border-b border-line pb-7">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge>{LEVEL_LABELS[meta.level]}</Badge>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatDuration(meta.durationMin)}
        </span>
        <span>Version {lesson.version}, publiée le {formatDate(lesson.publishedAt)}</span>
      </div>
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">{frenchSpacing(meta.title)}</h1>
      <p className="text-[17px] leading-relaxed text-ink-2">{frenchSpacing(meta.summary)}</p>
      <div className="grid gap-5 pt-2 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink">Vous saurez</p>
          <ul className="mt-1.5 space-y-1.5 text-[15px] text-ink-2">
            {meta.objectives.map((o) => (
              <li key={o} className="flex gap-2">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                {o}
              </li>
            ))}
          </ul>
        </div>
        {meta.prerequisites.length ? (
          <div>
            <p className="text-sm font-medium text-ink">Prérequis</p>
            <ul className="mt-1.5 space-y-1.5 text-[15px] text-ink-2">
              {meta.prerequisites.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </header>
  );

  if (locked) {
    return (
      <div className="grid gap-10 xl:grid-cols-[240px_1fr]">
        <aside className="hidden xl:block">{outline}</aside>
        <article className="space-y-8">
          {header}
          <Panel className="max-w-[78ch] p-6">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Lock className="h-4 w-4" aria-hidden="true" /> Leçon incluse dans l&apos;offre {TIER_LABELS[lesson.requiredTier]}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Votre progression est conservée. En passant à l&apos;offre supérieure, vous accédez à cette leçon, à son quiz corrigé et aux laboratoires associés.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="/campus/facturation">Voir les offres</ButtonLink>
              <ButtonLink href="/campus/formations" variant="secondary">
                Leçons accessibles
              </ButtonLink>
            </div>
          </Panel>
        </article>
      </div>
    );
  }

  let quiz: Awaited<ReturnType<typeof getPublicQuiz>> | null = null;
  let bestPercent: number | null = null;
  if (lesson.quizSlug) {
    quiz = await getPublicQuiz(lesson.quizSlug);
    const db = getDb();
    const [best] = await db
      .select({ percent: attempts.percent })
      .from(attempts)
      .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
      .where(and(eq(assessments.slug, lesson.quizSlug), eq(attempts.userId, u.id), eq(attempts.status, "submitted")))
      .orderBy(desc(attempts.percent))
      .limit(1);
    bestPercent = best?.percent ?? null;
  }
  const headings = blocks.filter((b): b is Extract<typeof b, { kind: "heading" }> => b.kind === "heading" && b.level === 2);
  const resumeId = progress?.lastBlockId && progress.status !== "completed" && progress.lastBlockId !== blocks[0]?.id ? progress.lastBlockId : null;

  return (
    <div className="grid gap-10 xl:grid-cols-[240px_minmax(0,1fr)_200px]">
      <aside className="hidden xl:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">{outline}</div>
      </aside>
      <article className="min-w-0 space-y-6">
        <LessonTracker slug={slug} />
        {resumeId ? <ResumeBanner blockId={resumeId} /> : null}
        {header}
        {blocks.map((b) => {
          if (b.kind === "quiz") {
            return quiz ? <QuizBlock key={b.id} quiz={quiz} title={b.title} bestPercent={bestPercent} /> : null;
          }
          if (b.kind === "exercise") {
            return <ExerciseBlock key={b.id} lessonSlug={slug} blockId={b.id} title={b.title} context={b.context} task={b.task} gradable={Boolean(b.rubric)} />;
          }
          return <StaticBlock key={b.id} block={b} />;
        })}
        <CompleteLesson slug={slug} completed={progress?.status === "completed"} next={lesson.next ? { slug: lesson.next.slug, title: lesson.next.title } : null} />
        <nav aria-label="Navigation entre leçons" className="flex max-w-[78ch] justify-between gap-4 border-t border-line pt-6 text-sm">
          {lesson.previous ? (
            <Link href={`/campus/cours/${lesson.previous.slug}`} className="flex items-center gap-1.5 text-ink-2 hover:text-ink">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {lesson.previous.title}
            </Link>
          ) : (
            <span />
          )}
          {lesson.next ? (
            <Link href={`/campus/cours/${lesson.next.slug}`} className="flex items-center gap-1.5 text-right text-ink-2 hover:text-ink">
              {lesson.next.title} <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      </article>
      <aside className="hidden xl:block">
        <nav aria-label="Dans cette leçon" className="sticky top-24 text-sm">
          <p className="mb-2 font-medium text-ink">Dans cette leçon</p>
          <ul className="space-y-1.5 border-l border-line">
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 leading-snug text-muted hover:border-ink hover:text-ink">
                  {h.text}
                </a>
              </li>
            ))}
            {quiz ? (
              <li>
                <a href="#quiz" className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-ink hover:text-ink">
                  Quiz
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

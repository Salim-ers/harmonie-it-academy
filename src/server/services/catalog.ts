import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, count, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  assessments,
  courseModules,
  courses,
  learningPaths,
  lessonVersions,
  lessons,
  pathCourses,
  plans,
  scenarios,
  appSettings,
  glossaryTerms,
  questions,
  interviewQuestions,
} from "@/server/db/schema";
import type { LessonDoc } from "@/content/schema";

/**
 * Lectures publiques mises en cache (contenu publié uniquement).
 * Invalidation : updateTag("catalog") / updateTag(`lesson:${slug}`) à la publication dans le Studio.
 */

export type CatalogLesson = { id: string; slug: string; title: string; durationMin: number; requiredTier: number; position: number };
export type CatalogModule = { id: string; slug: string; title: string; lessons: CatalogLesson[] };
export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  school: string;
  level: string;
  requiredTier: number;
  objectives: string[];
  modules: CatalogModule[];
  lessonCount: number;
  durationMin: number;
};

export async function getCatalog(): Promise<CatalogCourse[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  const db = getDb();
  const cs = await db.select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.position));
  if (!cs.length) return [];
  const mods = await db.select().from(courseModules).where(inArray(courseModules.courseId, cs.map((c) => c.id))).orderBy(asc(courseModules.position));
  const ls = mods.length
    ? await db
        .select({ id: lessons.id, slug: lessons.slug, title: lessons.title, durationMin: lessons.durationMin, requiredTier: lessons.requiredTier, position: lessons.position, moduleId: lessons.moduleId })
        .from(lessons)
        .where(and(inArray(lessons.moduleId, mods.map((m) => m.id)), eq(lessons.status, "published")))
        .orderBy(asc(lessons.position))
    : [];
  return cs.map((c) => {
    const modules = mods
      .filter((m) => m.courseId === c.id)
      .map((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        lessons: ls
          .filter((l) => l.moduleId === m.id)
          .map((l) => ({ id: l.id, slug: l.slug, title: l.title, durationMin: l.durationMin, position: l.position, requiredTier: l.requiredTier ?? c.requiredTier })),
      }));
    const all = modules.flatMap((m) => m.lessons);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      school: c.school,
      level: c.level,
      requiredTier: c.requiredTier,
      objectives: c.objectives,
      modules,
      lessonCount: all.length,
      durationMin: all.reduce((a, l) => a + l.durationMin, 0),
    };
  });
}

export async function getCourse(slug: string) {
  const all = await getCatalog();
  return all.find((c) => c.slug === slug) ?? null;
}

/** Leçon publiée + sa place dans la formation (précédente / suivante). */
export async function getPublishedLesson(slug: string) {
  "use cache";
  cacheTag("catalog", `lesson:${slug}`);
  cacheLife("hours");
  const db = getDb();
  const [row] = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      title: lessons.title,
      requiredTier: lessons.requiredTier,
      durationMin: lessons.durationMin,
      moduleId: lessons.moduleId,
      content: lessonVersions.content,
      version: lessonVersions.version,
      publishedAt: lessonVersions.publishedAt,
    })
    .from(lessons)
    .innerJoin(lessonVersions, eq(lessonVersions.id, lessons.publishedVersionId))
    .where(and(eq(lessons.slug, slug), eq(lessons.status, "published")))
    .limit(1);
  if (!row) return null;
  const catalog = await getCatalog();
  const course = catalog.find((c) => c.modules.some((m) => m.id === row.moduleId));
  if (!course) return null;
  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const index = flat.findIndex((l) => l.slug === slug);
  const [quiz] = await db.select({ slug: assessments.slug }).from(assessments).where(eq(assessments.lessonId, row.id)).limit(1);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    durationMin: row.durationMin,
    requiredTier: row.requiredTier ?? course.requiredTier,
    doc: row.content as LessonDoc,
    version: row.version,
    publishedAt: row.publishedAt,
    course: { id: course.id, slug: course.slug, title: course.title, modules: course.modules },
    previous: index > 0 ? flat[index - 1] : null,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null,
    quizSlug: quiz?.slug ?? null,
  };
}
export type PublishedLesson = NonNullable<Awaited<ReturnType<typeof getPublishedLesson>>>;

export async function getPaths() {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  const db = getDb();
  const ps = await db.select().from(learningPaths).where(eq(learningPaths.status, "published")).orderBy(asc(learningPaths.position));
  const pcs = ps.length ? await db.select().from(pathCourses).where(inArray(pathCourses.pathId, ps.map((p) => p.id))).orderBy(asc(pathCourses.position)) : [];
  return ps.map((p) => ({ ...p, courseIds: pcs.filter((x) => x.pathId === p.id).map((x) => x.courseId) }));
}

export async function getPublicScenarios() {
  "use cache";
  cacheTag("catalog", "scenarios");
  cacheLife("hours");
  return getDb()
    .select({ slug: scenarios.slug, title: scenarios.title, summary: scenarios.summary, sector: scenarios.sector, difficulty: scenarios.difficulty, requiredTier: scenarios.requiredTier })
    .from(scenarios)
    .where(eq(scenarios.status, "published"))
    .orderBy(asc(scenarios.position));
}

export async function getPlans() {
  "use cache";
  cacheTag("plans");
  cacheLife("hours");
  return getDb().select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.position));
}

export async function getSettings() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  const rows = await getDb().select().from(appSettings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  return {
    brandName: (map["brand.name"] as string) ?? "Harmonie IT Academy",
    owner: (map["brand.owner"] as string) ?? "Harmonie Solutions",
    signature: (map["brand.signature"] as string) ?? "Apprendre. Pratiquer. Maîtriser.",
    contactEmail: (map["brand.contactEmail"] as string) ?? "contact@example.com",
  };
}

export async function getGlossary() {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return getDb().select().from(glossaryTerms).orderBy(asc(glossaryTerms.termFr));
}

export async function getPublicAssessments() {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return getDb()
    .select({ slug: assessments.slug, title: assessments.title, description: assessments.description, kind: assessments.kind, requiredTier: assessments.requiredTier, timeLimitMin: assessments.timeLimitMin, passPercent: assessments.passPercent, maxAttempts: assessments.maxAttempts })
    .from(assessments)
    .where(and(eq(assessments.status, "published"), inArray(assessments.kind, ["exercise", "exam", "mock_exam", "placement"])));
}

/** Chiffres réels du catalogue (aucune statistique d'audience inventée). */
export async function getPublicStats() {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  const db = getDb();
  const [[l], [sc], [q], [iq]] = await Promise.all([
    db.select({ n: count() }).from(lessons).where(eq(lessons.status, "published")),
    db.select({ n: count() }).from(scenarios).where(eq(scenarios.status, "published")),
    db.select({ n: count() }).from(questions).where(isNotNull(questions.currentVersionId)),
    db.select({ n: count() }).from(interviewQuestions).where(eq(interviewQuestions.status, "published")),
  ]);
  return { lessons: l.n, scenarios: sc.n, questions: q.n, interviewQuestions: iq.n };
}

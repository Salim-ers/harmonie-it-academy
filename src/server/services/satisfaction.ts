import "server-only";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { getDb } from "@/server/db";
import { courseModules as modules, courses, lessonProgress, lessons, satisfactionSurveys } from "@/server/db/schema";
import { can, ForbiddenError, type Actor } from "@/server/authz/policies";

export class SatisfactionError extends Error {}

/** Part minimale du cours terminée pour donner un avis (des avis de personnes qui ont réellement suivi). */
const MIN_SHARE = 0.5;

async function courseShare(userId: string, courseId: string, db: Db) {
  const ids = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(eq(modules.courseId, courseId), eq(lessons.status, "published")));
  if (!ids.length) return 0;
  const [done] = await db
    .select({ n: count() })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, ids.map((i) => i.id))));
  return done.n / ids.length;
}

export async function getMySatisfaction(userId: string, courseId: string, db: Db = getDb()) {
  const [share, [row]] = await Promise.all([
    courseShare(userId, courseId, db),
    db.select().from(satisfactionSurveys).where(and(eq(satisfactionSurveys.userId, userId), eq(satisfactionSurveys.courseId, courseId))).limit(1),
  ]);
  return { eligible: share >= MIN_SHARE, share, answer: row ?? null };
}

export async function submitSatisfaction(
  userId: string,
  input: { courseId: string; rating: number; usefulForJob: boolean | null; comment: string },
  db: Db = getDb(),
) {
  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, input.courseId)).limit(1);
  if (!course) throw new SatisfactionError("Formation introuvable.");
  if ((await courseShare(userId, course.id, db)) < MIN_SHARE) throw new SatisfactionError("Votre avis sera demandé quand vous aurez terminé au moins la moitié de la formation.");
  await db
    .insert(satisfactionSurveys)
    .values({ userId, courseId: course.id, rating: input.rating, usefulForJob: input.usefulForJob, comment: input.comment })
    .onConflictDoUpdate({
      target: [satisfactionSurveys.userId, satisfactionSurveys.courseId],
      set: { rating: input.rating, usefulForJob: input.usefulForJob, comment: input.comment, createdAt: sql`now()` },
    });
}

/** Pour Harmonie Quality : par formation, et derniers commentaires **sans identité** de l'apprenant. */
export async function getSatisfactionReport(actor: Actor, db: Db = getDb()) {
  if (!can.viewPlatformAnalytics(actor)) throw new ForbiddenError();
  const [byCourse, comments] = await Promise.all([
    db
      .select({
        title: courses.title,
        n: count(),
        avg: sql<number>`round(avg(${satisfactionSurveys.rating})::numeric, 1)`,
        useful: sql<number | null>`round(100.0 * avg(case when ${satisfactionSurveys.usefulForJob} then 1 when ${satisfactionSurveys.usefulForJob} = false then 0 end))`,
      })
      .from(satisfactionSurveys)
      .innerJoin(courses, eq(courses.id, satisfactionSurveys.courseId))
      .groupBy(courses.title, courses.position)
      .orderBy(courses.position),
    db
      .select({ course: courses.title, rating: satisfactionSurveys.rating, comment: satisfactionSurveys.comment, at: satisfactionSurveys.createdAt })
      .from(satisfactionSurveys)
      .innerJoin(courses, eq(courses.id, satisfactionSurveys.courseId))
      .where(sql`length(${satisfactionSurveys.comment}) > 0`)
      .orderBy(desc(satisfactionSurveys.createdAt))
      .limit(20),
  ]);
  return { byCourse, comments };
}

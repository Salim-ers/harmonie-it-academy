import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { attestations, learningTime, lessonProgress, userBadges, userProfiles, xpEvents, attempts, assessments, lessons } from "@/server/db/schema";
import { getCatalog, getPaths } from "./catalog";
import { getSkillMap } from "./skills";
import { getUserTier } from "./entitlements";
import { getLabHistory } from "./labs";

function mondayOfWeek(d = new Date()) {
  const paris = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const day = (paris.getDay() + 6) % 7;
  paris.setDate(paris.getDate() - day);
  return paris.toLocaleDateString("sv-SE");
}

export async function getDashboard(userId: string) {
  const db = getDb();
  const [catalog, paths, skillMap, tier, labs] = await Promise.all([getCatalog(), getPaths(), getSkillMap(userId), getUserTier(userId), getLabHistory(userId)]);
  const [progressRows, week, [xp], badges, atts, [profile], recentAttempts] = await Promise.all([
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db.select({ day: learningTime.day, seconds: learningTime.seconds }).from(learningTime).where(and(eq(learningTime.userId, userId), gte(learningTime.day, mondayOfWeek()))),
    db.select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` }).from(xpEvents).where(eq(xpEvents.userId, userId)),
    db.select().from(userBadges).where(eq(userBadges.userId, userId)),
    db.select().from(attestations).where(eq(attestations.userId, userId)),
    db.select().from(userProfiles).where(eq(userProfiles.userId, userId)),
    db
      .select({ id: attempts.id, title: assessments.title, kind: assessments.kind, percent: attempts.percent, passed: attempts.passed, submittedAt: attempts.submittedAt, lessonSlug: lessons.slug })
      .from(attempts)
      .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
      .leftJoin(lessons, eq(lessons.id, assessments.lessonId))
      .where(and(eq(attempts.userId, userId), eq(attempts.status, "submitted")))
      .orderBy(desc(attempts.submittedAt))
      .limit(8),
  ]);

  const progress = new Map(progressRows.map((p) => [p.lessonId, p]));
  const path = paths[0];
  const pathCourses = path ? path.courseIds.map((id) => catalog.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c)) : catalog;
  const pathLessons = pathCourses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, courseSlug: c.slug, courseTitle: c.title }))));
  const completed = pathLessons.filter((l) => progress.get(l.id)?.status === "completed");
  const nextLessons = pathLessons.filter((l) => progress.get(l.id)?.status !== "completed").slice(0, 3);
  const lastTouched = progressRows
    .filter((p) => p.status !== "completed")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((p) => pathLessons.find((l) => l.id === p.lessonId))
    .find(Boolean);

  // Révisions conseillées : quiz de leçon sous le seuil et compétences confirmées faibles.
  const toReview = recentAttempts.filter((a) => a.kind === "lesson_quiz" && !a.passed && a.lessonSlug).slice(0, 3);
  const weakSkills = skillMap.skills.filter((s) => s.level !== null && s.level < 60).sort((a, b) => (a.level ?? 0) - (b.level ?? 0)).slice(0, 3);

  const weekSeconds = week.reduce((a, w) => a + w.seconds, 0);
  return {
    tier,
    path: path ? { title: path.title, total: pathLessons.length, completed: completed.length } : null,
    resume: lastTouched ?? nextLessons[0] ?? null,
    nextLessons,
    courses: pathCourses.map((c) => {
      const ls = c.modules.flatMap((m) => m.lessons);
      return { slug: c.slug, title: c.title, total: ls.length, completed: ls.filter((l) => progress.get(l.id)?.status === "completed").length };
    }),
    weekMinutes: Math.round(weekSeconds / 60),
    weeklyGoal: profile?.weeklyGoalMinutes ?? 180,
    totalMinutes: Math.round(progressRows.reduce((a, p) => a + p.timeSpentSec, 0) / 60),
    xp: Number(xp?.total ?? 0),
    badges: badges.map((b) => b.badgeCode),
    attestations: atts,
    skillMap,
    labs: labs.slice(0, 5),
    recentAttempts,
    toReview,
    weakSkills,
    placementDone: Boolean(profile?.placement),
  };
}
